import { expect, it } from 'vitest';
import { InMemoryContextStore } from '../../src/context/in-memory-context-store.js';
import { updateContextFromEvent } from '../../src/context/update-context-from-event.js';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { newCalendarEventId, newHouseholdId } from '../../src/kernel/ids.js';

it('adds a created calendar event to upcoming context', async () => {
  const householdId = newHouseholdId();
  const calendarEventId = newCalendarEventId();
  const clock = new FixedClock(new Date('2026-09-01T12:00:00Z'));
  const store = new InMemoryContextStore(clock);
  const event = createAgnesEvent(
    {
      type: 'calendar.event.created.v1',
      version: 1,
      source: 'test-calendar',
      householdId,
      entityType: 'calendar_event',
      entityId: calendarEventId,
      payload: {
        event: {
          id: calendarEventId,
          householdId,
          title: 'Football',
          description: null,
          startsAt: '2026-09-01T15:30:00.000Z',
          endsAt: '2026-09-01T16:30:00.000Z',
          timezone: 'Asia/Nicosia',
          status: 'confirmed',
        },
        change: 'created',
      },
    },
    clock,
  );

  await updateContextFromEvent(event, store);
  const context = await store.get(householdId);

  expect(context.upcomingEvents.map((item) => item.id)).toContain(calendarEventId);
  expect(context.activeEvents).toEqual([]);
  expect(context.peoplePresent).toEqual([]);
  expect(context.openNotifications).toEqual([]);
  expect(context.updatedAt).toEqual(clock.now());
});
