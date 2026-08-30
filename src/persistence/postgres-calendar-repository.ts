import type { Pool, PoolClient } from 'pg';
import type {
  CalendarEvent,
  ExternalReference,
} from '../calendar/calendar-event.js';
import type {
  CalendarRepository,
  CalendarUpsertChange,
} from '../calendar/calendar-repository.js';
import type {
  CalendarEventId,
  ExternalReferenceId,
  HouseholdId,
} from '../kernel/ids.js';

interface CalendarJoinRow {
  readonly id: string;
  readonly household_id: string;
  readonly title: string;
  readonly starts_at: Date;
  readonly ends_at: Date;
  readonly timezone: string;
  readonly status: 'confirmed';
  readonly external_reference_id: string;
  readonly provider: string;
  readonly external_id: string;
  readonly external_version: string | null;
  readonly etag: string | null;
  readonly sync_token: string | null;
  readonly last_synced_at: Date;
  readonly authoritative: boolean;
}

interface CalendarStateRow {
  readonly id: string;
  readonly household_id: string;
  readonly title: string;
  readonly starts_at: Date;
  readonly ends_at: Date;
  readonly timezone: string;
  readonly status: 'confirmed';
}

function mapExternalReference(row: CalendarJoinRow): ExternalReference {
  return {
    id: row.external_reference_id as ExternalReferenceId,
    provider: row.provider,
    externalId: row.external_id,
    lastSyncedAt: new Date(row.last_synced_at),
    authoritative: row.authoritative,
    ...(row.external_version === null ? {} : { externalVersion: row.external_version }),
    ...(row.etag === null ? {} : { etag: row.etag }),
    ...(row.sync_token === null ? {} : { syncToken: row.sync_token }),
  };
}

function mapCalendarEvent(row: CalendarJoinRow): CalendarEvent {
  return {
    id: row.id as CalendarEventId,
    householdId: row.household_id as HouseholdId,
    title: row.title,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    timezone: row.timezone,
    status: row.status,
    externalReference: mapExternalReference(row),
  };
}

function sameCanonicalState(row: CalendarStateRow, event: CalendarEvent): boolean {
  return (
    row.household_id === event.householdId &&
    row.title === event.title &&
    row.starts_at.getTime() === event.startsAt.getTime() &&
    row.ends_at.getTime() === event.endsAt.getTime() &&
    row.timezone === event.timezone &&
    row.status === event.status
  );
}

function storedExternalReference(
  event: CalendarEvent,
  id: ExternalReferenceId,
): ExternalReference {
  return {
    ...event.externalReference,
    id,
    lastSyncedAt: new Date(event.externalReference.lastSyncedAt),
  };
}

async function transaction<T>(database: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original transaction failure.
    }
    throw error;
  } finally {
    client.release();
  }
}

export class PostgresCalendarRepository implements CalendarRepository {
  constructor(private readonly database: Pool) {}

  async upsertByExternalReference(
    event: CalendarEvent,
  ): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }> {
    return transaction(this.database, async (client) => {
      const externalResult = await client.query<{ id: string }>(
        `INSERT INTO external_references(
          id, provider, external_id, external_version, etag, sync_token, last_synced_at, authoritative
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(provider, external_id) DO UPDATE SET
          external_version = EXCLUDED.external_version,
          etag = EXCLUDED.etag,
          sync_token = EXCLUDED.sync_token,
          last_synced_at = EXCLUDED.last_synced_at,
          authoritative = EXCLUDED.authoritative
        RETURNING id`,
        [
          event.externalReference.id,
          event.externalReference.provider,
          event.externalReference.externalId,
          event.externalReference.externalVersion ?? null,
          event.externalReference.etag ?? null,
          event.externalReference.syncToken ?? null,
          event.externalReference.lastSyncedAt,
          event.externalReference.authoritative,
        ],
      );

      const externalReferenceId = externalResult.rows[0]?.id as ExternalReferenceId | undefined;
      if (externalReferenceId === undefined) {
        throw new Error('external reference upsert did not return an id');
      }

      const existingResult = await client.query<CalendarStateRow>(
        `SELECT id, household_id, title, starts_at, ends_at, timezone, status
         FROM calendar_events
         WHERE external_reference_id = $1
         FOR UPDATE`,
        [externalReferenceId],
      );

      const existing = existingResult.rows[0];
      const externalReference = storedExternalReference(event, externalReferenceId);

      if (existing === undefined) {
        await client.query(
          `INSERT INTO calendar_events(
            id, household_id, title, starts_at, ends_at, timezone, status, external_reference_id
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            event.id,
            event.householdId,
            event.title,
            event.startsAt,
            event.endsAt,
            event.timezone,
            event.status,
            externalReferenceId,
          ],
        );

        return {
          event: { ...event, externalReference },
          change: 'created',
        };
      }

      const change: CalendarUpsertChange = sameCanonicalState(existing, event)
        ? 'unchanged'
        : 'updated';

      if (change === 'updated') {
        await client.query(
          `UPDATE calendar_events
           SET household_id = $2,
               title = $3,
               starts_at = $4,
               ends_at = $5,
               timezone = $6,
               status = $7
           WHERE id = $1`,
          [
            existing.id,
            event.householdId,
            event.title,
            event.startsAt,
            event.endsAt,
            event.timezone,
            event.status,
          ],
        );
      }

      return {
        event: {
          ...event,
          id: existing.id as CalendarEventId,
          externalReference,
        },
        change,
      };
    });
  }

  async listUpcoming(householdId: HouseholdId, from: Date): Promise<readonly CalendarEvent[]> {
    const result = await this.database.query<CalendarJoinRow>(
      `SELECT
         event.id,
         event.household_id,
         event.title,
         event.starts_at,
         event.ends_at,
         event.timezone,
         event.status,
         event.external_reference_id,
         reference.provider,
         reference.external_id,
         reference.external_version,
         reference.etag,
         reference.sync_token,
         reference.last_synced_at,
         reference.authoritative
       FROM calendar_events AS event
       JOIN external_references AS reference ON reference.id = event.external_reference_id
       WHERE event.household_id = $1 AND event.starts_at >= $2
       ORDER BY event.starts_at, event.id`,
      [householdId, from],
    );

    return result.rows.map(mapCalendarEvent);
  }

  async getById(id: CalendarEventId): Promise<CalendarEvent | null> {
    const result = await this.database.query<CalendarJoinRow>(
      `SELECT
         event.id,
         event.household_id,
         event.title,
         event.starts_at,
         event.ends_at,
         event.timezone,
         event.status,
         event.external_reference_id,
         reference.provider,
         reference.external_id,
         reference.external_version,
         reference.etag,
         reference.sync_token,
         reference.last_synced_at,
         reference.authoritative
       FROM calendar_events AS event
       JOIN external_references AS reference ON reference.id = event.external_reference_id
       WHERE event.id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row === undefined ? null : mapCalendarEvent(row);
  }
}
