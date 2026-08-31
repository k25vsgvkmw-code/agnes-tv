import type { Pool, PoolClient } from 'pg';
import type {
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventVisibility,
  ExternalReference,
} from '../calendar/calendar-event.js';
import type { CalendarRepository, CalendarUpsertChange } from '../calendar/calendar-repository.js';
import { AgnesError, ValidationError } from '../kernel/errors.js';
import type {
  CalendarEventId,
  ExternalReferenceId,
  HouseholdId,
  PersonId,
} from '../kernel/ids.js';

interface CalendarEventRow {
  id: string;
  household_id: string;
  owner_person_id: string | null;
  title: string;
  description: string | null;
  starts_at: Date;
  ends_at: Date;
  timezone: string;
  participants: unknown;
  location_id: string | null;
  recurrence: string | null;
  visibility: CalendarEventVisibility;
  status: CalendarEventStatus;
  er_id: string | null;
  er_provider: string | null;
  er_external_id: string | null;
  er_external_version: string | null;
  er_etag: string | null;
  er_sync_token: string | null;
  er_last_synced_at: Date | null;
  er_authoritative: boolean | null;
}

const eventSelect = `
  select
    ce.id,
    ce.household_id,
    ce.owner_person_id,
    ce.title,
    ce.description,
    ce.starts_at,
    ce.ends_at,
    ce.timezone,
    ce.participants,
    ce.location_id,
    ce.recurrence,
    ce.visibility,
    ce.status,
    er.id as er_id,
    er.provider as er_provider,
    er.external_id as er_external_id,
    er.external_version as er_external_version,
    er.etag as er_etag,
    er.sync_token as er_sync_token,
    er.last_synced_at as er_last_synced_at,
    er.authoritative as er_authoritative
  from calendar_events ce
  left join external_references er on er.id = ce.external_reference_id
`;

function parseParticipants(value: unknown): readonly PersonId[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((id) => id as PersonId);
}

function toExternalReference(row: CalendarEventRow): ExternalReference | null {
  if (
    !row.er_id ||
    !row.er_provider ||
    !row.er_external_id ||
    !row.er_last_synced_at ||
    row.er_authoritative === null
  ) {
    return null;
  }

  return {
    id: row.er_id as ExternalReferenceId,
    provider: row.er_provider,
    externalId: row.er_external_id,
    externalVersion: row.er_external_version,
    etag: row.er_etag,
    syncToken: row.er_sync_token,
    lastSyncedAt: row.er_last_synced_at,
    authoritative: row.er_authoritative,
  };
}

function toCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id as CalendarEventId,
    householdId: row.household_id as HouseholdId,
    ownerPersonId: row.owner_person_id as PersonId | null,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    participants: parseParticipants(row.participants),
    locationId: row.location_id,
    recurrence: row.recurrence,
    visibility: row.visibility,
    status: row.status,
    externalReference: toExternalReference(row),
  };
}

function isSameCanonicalEvent(row: CalendarEventRow, event: CalendarEvent): boolean {
  const existingParticipants = parseParticipants(row.participants);
  return (
    row.household_id === event.householdId &&
    row.owner_person_id === event.ownerPersonId &&
    row.title === event.title &&
    row.description === event.description &&
    row.starts_at.getTime() === event.startsAt.getTime() &&
    row.ends_at.getTime() === event.endsAt.getTime() &&
    row.timezone === event.timezone &&
    JSON.stringify(existingParticipants) === JSON.stringify(event.participants) &&
    row.location_id === event.locationId &&
    row.recurrence === event.recurrence &&
    row.visibility === event.visibility &&
    row.status === event.status
  );
}

async function readByExternalReference(
  tx: PoolClient,
  externalReferenceId: string,
  lock = false,
): Promise<CalendarEventRow | null> {
  const result = await tx.query<CalendarEventRow>(
    `${eventSelect} where ce.external_reference_id = $1${lock ? ' for update of ce' : ''}`,
    [externalReferenceId],
  );
  return result.rows[0] ?? null;
}

export class PostgresCalendarRepository implements CalendarRepository {
  constructor(private readonly db: Pool) {}

  async upsertByExternalReference(
    event: CalendarEvent,
  ): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }> {
    const reference = event.externalReference;
    if (!reference) {
      throw new ValidationError('calendar upsert requires an external reference');
    }

    const tx = await this.db.connect();
    try {
      await tx.query('begin');
      const referenceResult = await tx.query<{ id: string }>(
        `insert into external_references(
           id,provider,external_id,external_version,etag,sync_token,last_synced_at,authoritative
         ) values($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict(provider, external_id) do update set
           external_version = excluded.external_version,
           etag = excluded.etag,
           sync_token = excluded.sync_token,
           last_synced_at = excluded.last_synced_at,
           authoritative = excluded.authoritative
         returning id`,
        [
          reference.id,
          reference.provider,
          reference.externalId,
          reference.externalVersion,
          reference.etag,
          reference.syncToken,
          reference.lastSyncedAt,
          reference.authoritative,
        ],
      );
      const externalReferenceId = referenceResult.rows[0]?.id;
      if (!externalReferenceId) {
        throw new AgnesError(
          'PERSISTENCE_ERROR',
          'calendar external reference upsert returned no id',
        );
      }

      const existing = await readByExternalReference(tx, externalReferenceId, true);
      let change: CalendarUpsertChange;

      if (!existing) {
        await tx.query(
          `insert into calendar_events(
             id,household_id,owner_person_id,title,description,starts_at,ends_at,timezone,
             participants,location_id,recurrence,visibility,status,external_reference_id
           ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14)`,
          [
            event.id,
            event.householdId,
            event.ownerPersonId,
            event.title,
            event.description,
            event.startsAt,
            event.endsAt,
            event.timezone,
            JSON.stringify(event.participants),
            event.locationId,
            event.recurrence,
            event.visibility,
            event.status,
            externalReferenceId,
          ],
        );
        change = 'created';
      } else if (isSameCanonicalEvent(existing, event)) {
        change = 'unchanged';
      } else {
        await tx.query(
          `update calendar_events set
             household_id = $2,
             owner_person_id = $3,
             title = $4,
             description = $5,
             starts_at = $6,
             ends_at = $7,
             timezone = $8,
             participants = $9::jsonb,
             location_id = $10,
             recurrence = $11,
             visibility = $12,
             status = $13
           where id = $1`,
          [
            existing.id,
            event.householdId,
            event.ownerPersonId,
            event.title,
            event.description,
            event.startsAt,
            event.endsAt,
            event.timezone,
            JSON.stringify(event.participants),
            event.locationId,
            event.recurrence,
            event.visibility,
            event.status,
          ],
        );
        change = 'updated';
      }

      const stored = await readByExternalReference(tx, externalReferenceId);
      if (!stored) {
        throw new AgnesError('PERSISTENCE_ERROR', 'calendar upsert returned no stored event');
      }

      await tx.query('commit');
      return { event: toCalendarEvent(stored), change };
    } catch (error) {
      await tx.query('rollback');
      throw error;
    } finally {
      tx.release();
    }
  }

  async listUpcoming(householdId: HouseholdId, from: Date): Promise<readonly CalendarEvent[]> {
    const result = await this.db.query<CalendarEventRow>(
      `${eventSelect}
       where ce.household_id = $1 and ce.ends_at >= $2 and ce.status <> 'cancelled'
       order by ce.starts_at, ce.id`,
      [householdId, from],
    );
    return result.rows.map(toCalendarEvent);
  }

  async getById(id: CalendarEventId): Promise<CalendarEvent | null> {
    const result = await this.db.query<CalendarEventRow>(`${eventSelect} where ce.id = $1`, [id]);
    const row = result.rows[0];
    return row ? toCalendarEvent(row) : null;
  }
}
