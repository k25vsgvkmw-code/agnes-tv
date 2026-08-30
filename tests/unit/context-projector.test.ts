import { describe, expect, it } from 'vitest';
import { createCalendarEvent, createExternalReference } from '../../src/calendar/calendar-event.js';
import { InMemoryContextStore } from '../../src/context/in-memory-context-store.js';
import { updateContextFromEvent } from '../../src/context/update-context-from-event.js';
import { createAgnesEvent, type AgnesEvent } from '../../src/events/agnes-event.js';
import { newDeviceId, newHouseholdId, newPersonId } from '../../src/kernel/ids.js';
import type { PresenceState } from '../../src/presence/presence-state.js';
import { createTravelCondition } from '../../src/routing/travel-condition.js';
import { createWeatherSnapshot } from '../../src/weather/weather-snapshot.js';

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

function roundTripPayload<TPayload>(event: AgnesEvent<TPayload>): AgnesEvent<unknown> {
  return {
    ...event,
    payload: JSON.parse(JSON.stringify(event.payload)) as unknown,
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
    const store = new InMemoryContextStore();

    await updateContextFromEvent(roundTripPayload(event), store);
    const projected = (await store.get(householdId))?.upcomingEvents[0];

    expect(projected?.startsAt).toBeInstanceOf(Date);
    expect(projected?.endsAt).toBeInstanceOf(Date);
    expect(projected?.externalReference.lastSyncedAt).toBeInstanceOf(Date);
  });

  it('projects a weather snapshot and rehydrates observed and expiry dates', async () => {
    const householdId = newHouseholdId();
    const weatherSnapshot = createWeatherSnapshot({
      householdId,
      placeId: 'home',
      observedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:10:00Z'),
      temperatureC: 31,
      feelsLikeC: 33,
      condition: 'clear',
      rainProbability: 0.1,
      precipitationMm: 0,
      windSpeedKmh: 12,
      windGustKmh: 20,
      humidity: 0.6,
      visibilityKm: 10,
      uvIndex: 4,
      source: 'open-meteo',
      confidence: 0.9,
    });
    const event = createAgnesEvent({
      type: 'weather.snapshot.updated.v1',
      version: 1,
      occurredAt: weatherSnapshot.observedAt,
      receivedAt: weatherSnapshot.observedAt,
      source: 'open-meteo',
      householdId,
      payload: { weatherSnapshot },
      metadata: {},
    });
    const store = new InMemoryContextStore();

    await updateContextFromEvent(roundTripPayload(event), store);
    const projected = (await store.get(householdId))?.currentWeather;

    expect(projected?.temperatureC).toBe(31);
    expect(projected?.observedAt).toBeInstanceOf(Date);
    expect(projected?.expiresAt).toBeInstanceOf(Date);
  });

  it('projects travel conditions and rehydrates observed and expiry dates', async () => {
    const householdId = newHouseholdId();
    const travelCondition = createTravelCondition({
      observedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:05:00Z'),
      durationMinutes: 25,
      distanceKm: 18,
      trafficDelayMinutes: 7,
      source: 'google-routes',
      confidence: 0.9,
    });
    const event = createAgnesEvent({
      type: 'travel.conditions.updated.v1',
      version: 1,
      occurredAt: travelCondition.observedAt,
      receivedAt: travelCondition.observedAt,
      source: 'google-routes',
      householdId,
      payload: { travelCondition },
      metadata: {},
    });
    const store = new InMemoryContextStore();

    await updateContextFromEvent(roundTripPayload(event), store);
    const projected = (await store.get(householdId))?.travelConditions;

    expect(projected?.durationMinutes).toBe(25);
    expect(projected?.observedAt).toBeInstanceOf(Date);
    expect(projected?.expiresAt).toBeInstanceOf(Date);
  });

  it('projects presence by person and keeps compatibility presence lists in sync', async () => {
    const householdId = newHouseholdId();
    const personId = newPersonId();
    const presence: PresenceState = {
      state: 'PRESENT',
      confidence: 0.9,
      sources: ['LOCATION'],
      expiresAt: new Date('2026-09-01T15:10:00Z'),
    };
    const event = createAgnesEvent({
      type: 'person.presence.changed.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:00:00Z'),
      receivedAt: new Date('2026-09-01T15:00:00Z'),
      source: 'presence-resolver',
      householdId,
      entityType: 'person',
      entityId: personId,
      payload: { personId, presence },
      metadata: {},
    });
    const store = new InMemoryContextStore();

    await updateContextFromEvent(roundTripPayload(event), store);
    const context = await store.get(householdId);
    const projected = context?.presenceByPerson[personId];

    expect(projected?.state).toBe('PRESENT');
    expect(projected?.expiresAt).toBeInstanceOf(Date);
    expect(context?.peoplePresent).toContain(personId);
    expect(context?.peopleAway).not.toContain(personId);
  });

  it('projects device heartbeat state and rehydrates the heartbeat date', async () => {
    const householdId = newHouseholdId();
    const deviceId = newDeviceId();
    const event = createAgnesEvent({
      type: 'device.heartbeat.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:00:00Z'),
      receivedAt: new Date('2026-09-01T15:00:00Z'),
      source: 'device-ingress',
      householdId,
      entityType: 'device',
      entityId: deviceId,
      payload: {
        deviceState: {
          id: deviceId,
          lastHeartbeatAt: new Date('2026-09-01T15:00:00Z'),
        },
      },
      metadata: {},
    });
    const store = new InMemoryContextStore();

    await updateContextFromEvent(roundTripPayload(event), store);
    const projected = (await store.get(householdId))?.deviceStates[0];

    expect(projected?.id).toBe(deviceId);
    expect(projected?.lastHeartbeatAt).toBeInstanceOf(Date);
  });

  it('ignores malformed live payloads without creating context', async () => {
    const householdId = newHouseholdId();
    const event = createAgnesEvent({
      type: 'weather.snapshot.updated.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:00:00Z'),
      receivedAt: new Date('2026-09-01T15:00:00Z'),
      source: 'test',
      householdId,
      payload: { weatherSnapshot: { observedAt: 'not-a-date' } },
      metadata: {},
    });
    const store = new InMemoryContextStore();

    await expect(updateContextFromEvent(event, store)).resolves.toBeUndefined();
    await expect(store.get(householdId)).resolves.toBeNull();
  });
});
