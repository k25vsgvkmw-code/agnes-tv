import type { Pool, PoolClient } from 'pg';
import type {
  CalendarRepository,
  CalendarUpsertChange,
} from '../calendar/calendar-repository.js';
import type { CalendarEvent } from '../calendar/calendar-event.js';
import type { ExternalReference } from '../integrations/calendar/external-calendar-record.js';
import type { CalendarEventId, HouseholdId, PersonId } from '../kernel/ids.js';
import { ValidationError } from '../kernel/errors.js';
import { withTransaction } from './postgres.js';

interface CalendarRow {
  id: string;
  household_id: string;
  owner_person_id: string | null;
  title: string;
  description: string | null;
  starts_at: Date;
  ends_at: Date;
  timezone: string;
  participants: string[];
  visibility: CalendarEvent['visibility'];
  status: CalendarEvent['status'];
  provider: string | null;
  external_id: string | null;
  external_version: string | null;
  etag: string | null;
  sync_token: string | null;
  last_synced_at: Date | null;
  authoritative: boolean | null;
}

function rowToEvent(row: CalendarRow): CalendarEvent {
  const externalReference: ExternalReference | undefined =
    row.provider === null || row.external_id === null || row.last_synced_at === null
      ? undefined
      : {
          provider: row.provider,
          externalId: row.external_id,
          lastSyncedAt: new Date(row.last_synced_at),
          authoritative: row.authoritative ?? true,
          ...(row.external_version === null ? {} : { externalVersion: row.external_version }),
          ...(row.etag === null ? {} : { etag: row.etag }),
          ...(row.sync_token === null ? {} : { syncToken: row.sync_token }),
        };

  return {
    id: row.id as CalendarEventId,
    householdId: row.household_id as HouseholdId,
    title: row.title,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    timezone: row.timezone,
    participants: row.participants.map((id) => id as PersonId),
    visibility: row.visibility,
    status: row.status,
    ...(row.owner_person_id === null ? {} : { ownerPersonId: row.owner_person_id as PersonId }),
    ...(row.description === null ? {} : { description: row.description }),
    ...(externalReference === undefined ? {} : { externalReference }),
  };
}

const calendarSelect = `
  SELECT c.id, c.household_id, c.owner_person_id, c.title, c.description,
         c.starts_at, c.ends_at, c.timezone, c.participants, c.visibility, c.status,
         e.provider, e.external_id, e.external_version, e.etag, e.sync_token,
         e.last_synced_at, e.authoritative
  FROM calendar_events c
  LEFT JOIN external_references e ON e.id = c.external_reference_id`;

function sameLogicalEvent(row: CalendarRow, event: CalendarEvent): boolean {
  return (
    row.household_id === event.householdId &&
    row.owner_person_id === (event.ownerPersonId ?? null) &&
    row.title === event.title &&
    row.description === (event.description ?? null) &&
    new Date(row.starts_at).getTime() === event.startsAt.getTime() &&
    new Date(row.ends_at).getTime() === event.endsAt.getTime() &&
    row.timezone === event.timezone &&
    JSON.stringify(row.participants) === JSON.stringify(event.participants) &&
    row.visibility === event.visibility &&
    row.status === event.status
  );
}

export class PostgresCalendarRepository implements CalendarRepository {
  constructor(private readonly pool: Pool) {}

  async upsertByExternalReference(
    event: CalendarEvent,
  ): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }> {
    const reference = event.externalReference;
    if (reference === undefined) {
      throw new ValidationError('externalReference is required for imported calendar events');
    }

    return withTransaction(this.pool, async (client) => {
      const externalReferenceId = await this.upsertExternalReference(client, reference);
      const existingResult = await client.query<CalendarRow>(
        `${calendarSelect} WHERE c.external_reference_id = $1 FOR UPDATE OF c`,
        [externalReferenceId],
      );
      const existing = existingResult.rows[0];

      if (existing === undefined) {
        await client.query(
          `INSERT INTO calendar_events (
             id, household_id, owner_person_id, title, description, starts_at, ends_at,
             timezone, participants, visibility, status, external_reference_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)`,
          [
            event.id,
            event.householdId,
            event.ownerPersonId ?? null,
            event.title,
            event.description ?? null,
            event.startsAt,
            event.endsAt,
            event.timezone,
            JSON.stringify(event.participants),
            event.visibility,
            event.status,
            externalReferenceId,
          ],
        );
        return { event, change: 'created' as const };
      }

      if (sameLogicalEvent(existing, event)) {
        return { event: rowToEvent(existing), change: 'unchanged' as const };
      }

      await client.query(
        `UPDATE calendar_events SET
           household_id = $2, owner_person_id = $3, title = $4, description = $5,
           starts_at = $6, ends_at = $7, timezone = $8, participants = $9::jsonb,
           visibility = $10, status = $11, updated_at = now()
         WHERE id = $1`,
        [
          existing.id,
          event.householdId,
          event.ownerPersonId ?? null,
          event.title,
          event.description ?? null,
          event.startsAt,
          event.endsAt,
          event.timezone,
          JSON.stringify(event.participants),
          event.visibility,
          event.status,
        ],
      );

      const updated = await this.getByIdUsing(client, existing.id as CalendarEventId);
      if (updated === null) throw new Error('calendar event disappeared during update');
      return { event: updated, change: 'updated' as const };
    });
  }

  async listUpcoming(householdId: HouseholdId, from: Date): Promise<readonly CalendarEvent[]> {
    const result = await this.pool.query<CalendarRow>(
      `${calendarSelect}
       WHERE c.household_id = $1 AND c.ends_at >= $2
       ORDER BY c.starts_at ASC`,
      [householdId, from],
    );
    return result.rows.map(rowToEvent);
  }

  async getById(id: CalendarEventId): Promise<CalendarEvent | null> {
    return this.getByIdUsing(this.pool, id);
  }

  private async getByIdUsing(
    executor: Pick<Pool | PoolClient, 'query'>,
    id: CalendarEventId,
  ): Promise<CalendarEvent | null> {
    const result = await executor.query<CalendarRow>(`${calendarSelect} WHERE c.id = $1`, [id]);
    const row = result.rows[0];
    return row === undefined ? null : rowToEvent(row);
  }

  private async upsertExternalReference(
    client: PoolClient,
    reference: ExternalReference,
  ): Promise<number> {
    const result = await client.query<{ id: number }>(
      `INSERT INTO external_references (
         provider, external_id, external_version, etag, sync_token, last_synced_at, authoritative
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (provider, external_id) DO UPDATE SET
         external_version = EXCLUDED.external_version,
         etag = EXCLUDED.etag,
         sync_token = EXCLUDED.sync_token,
         last_synced_at = EXCLUDED.last_synced_at,
         authoritative = EXCLUDED.authoritative
       RETURNING id`,
      [
        reference.provider,
        reference.externalId,
        reference.externalVersion ?? null,
        reference.etag ?? null,
        reference.syncToken ?? null,
        reference.lastSyncedAt,
        reference.authoritative,
      ],
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error('external reference upsert did not return an id');
    return id;
  }
}
