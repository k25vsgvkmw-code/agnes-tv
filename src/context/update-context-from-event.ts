import type { CalendarEvent } from '../calendar/calendar-event.js';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { ContextStore } from './context-store.js';
import { emptyHouseholdContext } from './household-context.js';

function readCalendarEvent(event: AgnesEvent): CalendarEvent | null {
  if (event.type !== 'calendar.event.created.v1') {
    return null;
  }

  if (typeof event.payload !== 'object' || event.payload === null) {
    return null;
  }

  if (!('calendarEvent' in event.payload)) {
    return null;
  }

  return (event.payload as { calendarEvent?: CalendarEvent }).calendarEvent ?? null;
}

export async function updateContextFromEvent(
  event: AgnesEvent,
  store: ContextStore,
): Promise<void> {
  const calendarEvent = readCalendarEvent(event);
  if (calendarEvent === null) {
    return;
  }

  const existing = await store.get(event.householdId);
  const context = existing ?? emptyHouseholdContext(event.householdId, event.occurredAt);

  await store.put({
    ...context,
    timestamp: new Date(event.occurredAt),
    upcomingEvents: [...context.upcomingEvents, calendarEvent],
  });
}
