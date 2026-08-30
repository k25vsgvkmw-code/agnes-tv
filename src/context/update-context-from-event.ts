import type { AgnesEvent } from '../events/agnes-event.js';
import type { CalendarEventId, PersonId } from '../kernel/ids.js';
import type { ContextStore } from './context-store.js';
import {
  createEmptyHouseholdContext,
  type ContextCalendarEvent,
  type HouseholdContext,
} from './household-context.js';

const supportedCalendarEvents = new Set(['calendar.event.created.v1', 'calendar.event.updated.v1']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCalendarProjection(payload: unknown): ContextCalendarEvent | null {
  if (!isRecord(payload)) return null;

  const { id, title, startsAt, endsAt, timezone, participants, visibility, status } = payload;
  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof startsAt !== 'string' ||
    typeof endsAt !== 'string' ||
    typeof timezone !== 'string' ||
    !Array.isArray(participants) ||
    !participants.every((personId) => typeof personId === 'string') ||
    (visibility !== 'private' && visibility !== 'household') ||
    (status !== 'confirmed' && status !== 'cancelled')
  ) {
    return null;
  }

  const parsedStartsAt = new Date(startsAt);
  const parsedEndsAt = new Date(endsAt);
  if (Number.isNaN(parsedStartsAt.getTime()) || Number.isNaN(parsedEndsAt.getTime())) return null;

  const ownerPersonId = payload.ownerPersonId;
  const description = payload.description;
  if (ownerPersonId !== undefined && typeof ownerPersonId !== 'string') return null;
  if (description !== undefined && typeof description !== 'string') return null;

  return {
    id: id as CalendarEventId,
    title,
    startsAt: parsedStartsAt,
    endsAt: parsedEndsAt,
    timezone,
    participants: participants as PersonId[],
    visibility,
    status,
    ...(ownerPersonId === undefined ? {} : { ownerPersonId: ownerPersonId as PersonId }),
    ...(description === undefined ? {} : { description }),
  };
}

function withoutEvent(
  events: readonly ContextCalendarEvent[],
  eventId: CalendarEventId,
): ContextCalendarEvent[] {
  return events.filter((event) => event.id !== eventId);
}

function byStartTime(left: ContextCalendarEvent, right: ContextCalendarEvent): number {
  return left.startsAt.getTime() - right.startsAt.getTime();
}

function projectCalendarEvent(
  context: HouseholdContext,
  event: ContextCalendarEvent,
  projectedAt: Date,
): HouseholdContext {
  const activeEvents = withoutEvent(context.activeEvents, event.id);
  const upcomingEvents = withoutEvent(context.upcomingEvents, event.id);
  const now = projectedAt.getTime();

  if (event.status !== 'cancelled') {
    if (event.startsAt.getTime() <= now && event.endsAt.getTime() > now) {
      activeEvents.push(event);
    } else if (event.startsAt.getTime() > now) {
      upcomingEvents.push(event);
    }
  }

  activeEvents.sort(byStartTime);
  upcomingEvents.sort(byStartTime);

  return {
    ...context,
    timestamp: new Date(projectedAt),
    activeEvents,
    upcomingEvents,
  };
}

export async function updateContextFromEvent(
  event: AgnesEvent,
  store: ContextStore,
): Promise<void> {
  if (!supportedCalendarEvents.has(event.type)) return;

  const calendarEvent = parseCalendarProjection(event.payload);
  if (calendarEvent === null) return;

  const current =
    (await store.get(event.householdId)) ??
    createEmptyHouseholdContext(event.householdId, event.occurredAt);
  const projected = projectCalendarEvent(current, calendarEvent, event.occurredAt);

  await store.put(projected);
}
