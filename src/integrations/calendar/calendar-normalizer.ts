import { ValidationError } from '../../kernel/errors.js';
import type {
  ExternalCalendarRecord,
  ExternalReference,
  NormalizedCalendarRecord,
} from './external-calendar-record.js';

export function normalizeCalendarRecord(
  record: ExternalCalendarRecord,
  syncedAt: Date = new Date(),
): NormalizedCalendarRecord {
  const title = record.title.trim();
  const timezone = record.timezone.trim();
  const provider = record.provider.trim();
  const externalId = record.externalId.trim();
  const startsAt = new Date(record.startsAt);
  const endsAt = new Date(record.endsAt);

  if (!provider) throw new ValidationError('calendar provider is required');
  if (!externalId) throw new ValidationError('externalId is required');
  if (!title) throw new ValidationError('calendar event title is required');
  if (!timezone) throw new ValidationError('calendar event timezone is required');
  if (Number.isNaN(startsAt.getTime())) throw new ValidationError('startsAt must be a valid date');
  if (Number.isNaN(endsAt.getTime())) throw new ValidationError('endsAt must be a valid date');
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('endsAt must be after startsAt');
  }

  const externalReference: ExternalReference = {
    provider,
    externalId,
    lastSyncedAt: new Date(syncedAt),
    authoritative: true,
    ...(record.version === undefined ? {} : { externalVersion: record.version }),
    ...(record.etag === undefined ? {} : { etag: record.etag }),
    ...(record.syncToken === undefined ? {} : { syncToken: record.syncToken }),
  };

  return {
    title,
    startsAt,
    endsAt,
    timezone,
    externalReference,
    ...(record.description === undefined ? {} : { description: record.description.trim() }),
  };
}
