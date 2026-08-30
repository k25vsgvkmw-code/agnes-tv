import { describe, expect, it } from 'vitest';
import type { AgnesEvent } from '../../src/events/agnes-event.js';
import { InMemoryContextStore } from '../../src/context/in-memory-context-store.js';
import { updateContextFromEvent } from '../../src/context/update-context-from-event.js';
import {
  newEventId,
  type CalendarEventId,
  type HouseholdId,
} from '../../src/kernel/ids.js';

const householdId = '83000000-0000-4000-8000-000000000001' as HouseholdId;
const calendarEventId = '83000000-0000-4000-8000-000000000002' as CalendarEventId;
const projectedAt = new Date('2026-09-01T15:00:00Z');

function calendarEvent(
  type: 'calendar.event.created.v1' | 'calendar.event.updated.v1',
  overrides: Partial<Record<'title' | 'startsAt' | 'endsAt', string>> = {},
): AgnesEvent {
  return {
    id: newEventId(),
    type,
    version: 1,
    occurredAt: projectedAt,
    receivedAt: projectedAt,
    source: 'test-calendar',
    householdId,
    entityType: 'calendar_event',
    entityId: calendarEventId,
    payload: {
      id: calendarEventId,
      title: overrides.title ?? 'Football',
      startsAt: overrides.startsAt ?? '2026-09-01T16:00:00Z',
      endsAt: overrides.endsAt ?? '2026-09-01T17:00:00Z',
      timezone: 'Asia/Nicosia',
      participants: [],
      visibility: 'household',
      status: 'confirmed',
    },
    metadata: {},
  };
}

describe('updateContextFromEvent', () => {
  it('adds a created calendar event to upcoming context with the canonical empty fields present', async () => {
    const store = new InMemoryContextStore();

    await updateContextFromEvent(calendarEvent('calendar.event.created.v1'), store);
    const context = await store.get(householdId);

    expect(context).not.toBeNull();
    expect(context?.timestamp).toEqual(projectedAt);
    expect(context?.upcomingEvents.map((event) => event.id)).toContain(calendarEventId);
    expect(context).toMatchObject({
      peoplePresent: [],
      peopleAway: [],
      activeEvents: [],
      activeTasks: [],
      urgentTasks: [],
      currentWeather: null,
      travelConditions: null,
      activeRoutines: [],
      deviceStates: [],
      openNotifications: [],
      attentionStates: [],
      detectedSituations: [],
    });
  });

  it('classifies an event spanning the projection timestamp as active', async () => {
    const store = new InMemoryContextStore();

    await updateContextFromEvent(
      calendarEvent('calendar.event.created.v1', {
        startsAt: '2026-09-01T14:30:00Z',
        endsAt: '2026-09-01T15:30:00Z',
      }),
      store,
    );
    const context = await store.get(householdId);

    expect(context?.activeEvents.map((event) => event.id)).toEqual([calendarEventId]);
    expect(context?.upcomingEvents).toEqual([]);
  });

  it('replaces an existing projection on calendar update instead of duplicating it', async () => {
    const store = new InMemoryContextStore();

    await updateContextFromEvent(calendarEvent('calendar.event.created.v1'), store);
    await updateContextFromEvent(
      calendarEvent('calendar.event.updated.v1', { title: 'Football - updated' }),
      store,
    );
    const context = await store.get(householdId);

    expect(context?.upcomingEvents).toHaveLength(1);
    expect(context?.upcomingEvents[0]?.title).toBe('Football - updated');
  });
});
