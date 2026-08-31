import type { CalendarEvent } from './calendar-event.js';
import type { CalendarEventId, HouseholdId } from '../kernel/ids.js';

export interface CalendarRepository {
  save(event: CalendarEvent): Promise<void>;
  getById(id: CalendarEventId): Promise<CalendarEvent | null>;
  listByHousehold(householdId: HouseholdId): Promise<readonly CalendarEvent[]>;
  findByExternalReference(provider: string, externalId: string): Promise<CalendarEvent | null>;
}
