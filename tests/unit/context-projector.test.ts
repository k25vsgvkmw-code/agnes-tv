import { describe, expect, it } from 'vitest';
import { createCalendarEvent, createExternalReference } from '../../src/calendar/calendar-event.js';
import { InMemoryContextStore } from '../../src/context/in-memory-context-store.js';
import { updateContextFromEvent } from '../../src/context/update-context-from-event.js';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { newHouseholdId } from '../../src/kernel/ids.js';

function createCalendarCreatedEvent() {
  const householdId = newHouseholdId();
  const calendarEvent = createCalendarEvent({
    householdId,
    title: 'Football',
    startsAt: new Date('2026-09-01T15:30:00Z'),
    endsAt: new Date('2026-09-01T16:30:00Z'),
    timezone: 'Asia/Nicosia',
    externalReference: createExternalReference({
      provider: 'test-calendar',
      externalId: 'evt-1',
      lastSyncedAt: new Date('2026-08-30T09:00:00Z'),
      authoritative: true,
    }),
  });

  return {
    householdId,
    calendarEvent,
    event: createAgnesEvent({
      type: 'calendar.event.created.v1',
      version: 1,
      occurredAt: new Date('2026-08-30T09:00:00Z'),
      receivedAt: new Date('2026-08-30T09:00:00Z'),
      source: 'test-calendar',
      householdId,
      entityType: 'calendar_event',
      entityId: calendarEvent.id,
      payload: { calendarEvent },
      metadata: {},
    }),
  };
}

describe('household context projector', () => {
  it('adds a created calendar event to upcoming context', async () => {
    const { householdId, calendarEvent, event } = createCalendarCreatedEvent();
    const store = new InMemoryContextStore();

    await updateContextFromEvent(event, store);
    const context = await store.get(householdId);

    expect(context?.upcomingEvents.map((item) => item.id)).toContain(calendarEvent.id);
  });

  it('rehydrates calendar dates after an outbox JSON round trip', async () => {
    const { householdId, event } = createCalendarCreatedEvent();
    const serializedPayload = JSON.parse(JSON.stringify(event.payload)) as unknown;
    const persistedEvent = { ...event, payload: serializedPayload };
    const store = new InMemoryContextStore();

    await updateContextFromEvent(persistedEvent, store);
    const projected = (await store.get(householdId))?.upcomingEvents[0];

    expect(projected?.startsAt).toBeInstanceOf(Date);
    expect(projected?.endsAt).toBeInstanceOf(Date);
    expect(projected?.externalReference.lastSyncedAt).toBeInstanceOf(Date);
  });
});
