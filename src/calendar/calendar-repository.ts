import type { CalendarEvent } from './calendar-event.js';
import type { CalendarEventId, HouseholdId } from '../kernel/ids.js';

export type CalendarUpsertChange = 'created' | 'updated' | 'unchanged';

export interface CalendarRepository<TTransaction = unknown> {
  upsertByExternalReference(
    event: CalendarEvent,
    transaction?: TTransaction,
  ): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }>;
  listUpcoming(householdId: HouseholdId, from: Date): Promise<readonly CalendarEvent[]>;
  getById(id: CalendarEventId): Promise<CalendarEvent | null>;
}
