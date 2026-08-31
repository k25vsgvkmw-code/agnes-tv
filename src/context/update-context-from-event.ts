import type { AgnesEvent } from '../events/agnes-event.js';
import type { CalendarEventId, HouseholdId } from '../kernel/ids.js';
import type { ContextStore } from './context-store.js';
import type { ContextCalendarEvent, HouseholdContext } from './household-context.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseCalendarEvent(payload: unknown): ContextCalendarEvent | null {
  if (!isRecord(payload) || !isRecord(payload.event)) {
    return null;
  }

  const candidate = payload.event;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.householdId !== 'string' ||
    typeof candidate.title !== 'string' ||
    (candidate.description !== null && typeof candidate.description !== 'string') ||
    typeof candidate.startsAt !== 'string' ||
    typeof candidate.endsAt !== 'string' ||
    typeof candidate.timezone !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    return null;
  }

  const startsAt = new Date(candidate.startsAt);
  const endsAt = new Date(candidate.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return null;
  }

  return {
    id: candidate.id as CalendarEventId,
    householdId: candidate.householdId as HouseholdId,
    title: candidate.title,
    description: candidate.description,
    startsAt,
    endsAt,
    timezone: candidate.timezone,
    status: candidate.status,
  };
}

function projectCalendarEvent(
  context: HouseholdContext,
  calendarEvent: ContextCalendarEvent,
  now: Date,
): HouseholdContext {
  const activeEvents = context.activeEvents.filter((item) => item.id !== calendarEvent.id);
  const upcomingEvents = context.upcomingEvents.filter((item) => item.id !== calendarEvent.id);

  if (calendarEvent.status !== 'cancelled') {
    if (
      calendarEvent.startsAt.getTime() <= now.getTime() &&
      calendarEvent.endsAt.getTime() > now.getTime()
    ) {
      activeEvents.push(calendarEvent);
    } else if (calendarEvent.startsAt.getTime() > now.getTime()) {
      upcomingEvents.push(calendarEvent);
    }
  }

  activeEvents.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  upcomingEvents.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  return {
    ...context,
    updatedAt: new Date(now),
    activeEvents,
    upcomingEvents,
  };
}

export async function updateContextFromEvent(
  event: AgnesEvent,
  store: ContextStore,
): Promise<void> {
  if (event.type !== 'calendar.event.created.v1' && event.type !== 'calendar.event.updated.v1') {
    return;
  }

  const calendarEvent = parseCalendarEvent(event.payload);
  if (!calendarEvent || calendarEvent.householdId !== event.householdId) {
    return;
  }

  const current = await store.get(event.householdId);
  const updated = projectCalendarEvent(current, calendarEvent, event.receivedAt);
  await store.save(updated);
}
