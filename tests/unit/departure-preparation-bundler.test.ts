import { describe, expect, it } from 'vitest';
import {
  createCalendarEvent,
  createExternalReference,
  type CalendarEvent,
} from '../../src/calendar/calendar-event.js';
import { newHouseholdId, newPersonId } from '../../src/kernel/ids.js';
import type { PresenceState } from '../../src/presence/presence-state.js';
import { createTravelCondition, type TravelCondition } from '../../src/routing/travel-condition.js';
import { evaluateLiveAutomation } from '../../src/automations/evaluate-live-automation.js';
import { bundleDeparturePreparation } from '../../src/situations/departure-preparation-bundler.js';
import { hasMaterialDepartureChange } from '../../src/situations/material-change.js';
import { shouldSuppressByCooldown } from '../../src/situations/cooldown-policy.js';
import { createWeatherSnapshot, type WeatherSnapshot } from '../../src/weather/weather-snapshot.js';

function calendarEvent(): CalendarEvent {
  const householdId = newHouseholdId();
  return createCalendarEvent({
    householdId,
    title: 'Προπόνηση',
    startsAt: new Date('2026-09-01T15:30:00Z'),
    endsAt: new Date('2026-09-01T16:30:00Z'),
    timezone: 'Asia/Nicosia',
    externalReference: createExternalReference({
      provider: 'test-calendar',
      externalId: 'training-1',
      lastSyncedAt: new Date('2026-09-01T14:50:00Z'),
      authoritative: true,
    }),
  });
}

function present(): PresenceState {
  return {
    state: 'PRESENT',
    confidence: 0.95,
    sources: ['LOCATION'],
    expiresAt: new Date('2026-09-01T15:10:00Z'),
  };
}

function route(expiresAt = new Date('2026-09-01T15:10:00Z')): TravelCondition {
  return createTravelCondition({
    observedAt: new Date('2026-09-01T14:59:00Z'),
    expiresAt,
    durationMinutes: 25,
    distanceKm: 12,
    trafficDelayMinutes: 7,
    source: 'test-routing',
    confidence: 0.94,
  });
}

function weather(expiresAt = new Date('2026-09-01T15:10:00Z')): WeatherSnapshot {
  return createWeatherSnapshot({
    householdId: newHouseholdId(),
    placeId: 'home',
    observedAt: new Date('2026-09-01T14:55:00Z'),
    expiresAt,
    temperatureC: 28,
    feelsLikeC: 29,
    condition: 'rain',
    rainProbability: 0.8,
    precipitationMm: 2,
    windSpeedKmh: 15,
    windGustKmh: 25,
    humidity: 70,
    visibilityKm: 10,
    uvIndex: 2,
    source: 'test-weather',
    confidence: 0.9,
  });
}

describe('Live v2 departure preparation bundling', () => {
  it('bundles calendar, PRESENT presence, route, traffic, and rain into exactly one situation', () => {
    const event = calendarEvent();
    const targetPersonId = newPersonId();
    const result = bundleDeparturePreparation({
      householdId: event.householdId,
      targetPersonId,
      event,
      presence: present(),
      route: route(),
      weather: { ...weather(), householdId: event.householdId },
      now: new Date('2026-09-01T15:00:00Z'),
      departureBufferMinutes: 10,
      correlationId: 'corr-departure-1',
    });

    expect(result).toBeDefined();
    expect(result?.situation.type).toBe('DEPARTURE_PREPARATION');
    expect(result?.requiredDepartureAt).toEqual(new Date('2026-09-01T14:55:00Z'));
    expect(result?.minutesEarly).toBe(35);
    expect(result?.message).toBe('Φύγετε περίπου 35 λεπτά νωρίτερα· αναμένεται βροχή.');
    expect(result?.situation.relatedEntities).toEqual(
      expect.arrayContaining([
        { type: 'calendar_event', id: event.id },
        { type: 'person', id: targetPersonId },
      ]),
    );
    expect(result?.situation.supportingFactors).toEqual(
      expect.arrayContaining([
        { name: 'route_minutes', value: 25 },
        { name: 'required_departure_at', value: '2026-09-01T14:55:00.000Z' },
        { name: 'traffic_delay_minutes', value: 7 },
        { name: 'rain_probability', value: 0.8 },
      ]),
    );
  });

  it('omits expired weather instead of using stale rain data', () => {
    const event = calendarEvent();
    const result = bundleDeparturePreparation({
      householdId: event.householdId,
      targetPersonId: newPersonId(),
      event,
      presence: present(),
      route: route(),
      weather: { ...weather(new Date('2026-09-01T15:00:00Z')), householdId: event.householdId },
      now: new Date('2026-09-01T15:00:00Z'),
      departureBufferMinutes: 10,
      correlationId: 'corr-weather-expired',
    });

    expect(result).toBeDefined();
    expect(result?.message).toBe('Φύγετε περίπου 35 λεπτά νωρίτερα.');
    expect(result?.situation.supportingFactors).not.toEqual(
      expect.arrayContaining([{ name: 'rain_probability', value: 0.8 }]),
    );
  });

  it('does not calculate route-based departure from an expired route', () => {
    const event = calendarEvent();
    const result = bundleDeparturePreparation({
      householdId: event.householdId,
      targetPersonId: newPersonId(),
      event,
      presence: present(),
      route: route(new Date('2026-09-01T15:00:00Z')),
      weather: { ...weather(), householdId: event.householdId },
      now: new Date('2026-09-01T15:00:00Z'),
      departureBufferMinutes: 10,
      correlationId: 'corr-route-expired',
    });

    expect(result).toBeDefined();
    expect(result?.requiredDepartureAt).toBeUndefined();
    expect(result?.situation.supportingFactors).not.toEqual(
      expect.arrayContaining([{ name: 'route_minutes', value: 25 }]),
    );
  });

  it('does not treat UNKNOWN presence as PRESENT', () => {
    const event = calendarEvent();
    const result = bundleDeparturePreparation({
      householdId: event.householdId,
      targetPersonId: newPersonId(),
      event,
      presence: { state: 'UNKNOWN', confidence: 0, sources: [] },
      route: route(),
      weather: { ...weather(), householdId: event.householdId },
      now: new Date('2026-09-01T15:00:00Z'),
      departureBufferMinutes: 10,
      correlationId: 'corr-unknown',
    });

    expect(result).toBeUndefined();
  });

  it('detects material departure shifts and urgency threshold crossings', () => {
    expect(
      hasMaterialDepartureChange(
        { requiredDepartureAt: new Date('2026-09-01T15:00:00Z'), urgency: 0.7 },
        { requiredDepartureAt: new Date('2026-09-01T14:50:00Z'), urgency: 0.7 },
      ),
    ).toBe(true);
    expect(
      hasMaterialDepartureChange(
        { requiredDepartureAt: new Date('2026-09-01T15:00:00Z'), urgency: 0.79 },
        { requiredDepartureAt: new Date('2026-09-01T14:55:00Z'), urgency: 0.8 },
      ),
    ).toBe(true);
    expect(
      hasMaterialDepartureChange(
        { requiredDepartureAt: new Date('2026-09-01T15:00:00Z'), urgency: 0.7 },
        { requiredDepartureAt: new Date('2026-09-01T14:55:00Z'), urgency: 0.75 },
      ),
    ).toBe(false);
  });

  it('suppresses the same fingerprint for 10 minutes unless there is material change', () => {
    const lastEmittedAt = new Date('2026-09-01T15:00:00Z');
    expect(
      shouldSuppressByCooldown({
        lastEmittedAt,
        now: new Date('2026-09-01T15:09:59Z'),
        materialChange: false,
      }),
    ).toBe(true);
    expect(
      shouldSuppressByCooldown({
        lastEmittedAt,
        now: new Date('2026-09-01T15:01:00Z'),
        materialChange: true,
      }),
    ).toBe(false);
    expect(
      shouldSuppressByCooldown({
        lastEmittedAt,
        now: new Date('2026-09-01T15:10:00Z'),
        materialChange: false,
      }),
    ).toBe(false);
  });

  it('creates a routable automation candidate without performing delivery', () => {
    const event = calendarEvent();
    const targetPersonId = newPersonId();
    const bundled = bundleDeparturePreparation({
      householdId: event.householdId,
      targetPersonId,
      event,
      presence: present(),
      route: route(),
      weather: { ...weather(), householdId: event.householdId },
      now: new Date('2026-09-01T15:00:00Z'),
      departureBufferMinutes: 10,
      correlationId: 'corr-candidate',
    });
    expect(bundled).toBeDefined();

    const candidate = evaluateLiveAutomation({
      situation: bundled!.situation,
      targetPersonId,
      title: 'Ώρα να ετοιμαστείτε',
      message: bundled!.message,
      urgency: bundled!.urgency,
      allowedChannels: ['MOBILE_PUSH', 'VOICE_HOME', 'SILENT_FEED'],
    });

    expect(candidate).toEqual(
      expect.objectContaining({
        householdId: event.householdId,
        targetPersonId,
        privacy: 'HOUSEHOLD',
        audience: { kind: 'PERSON', personId: targetPersonId },
        situationFingerprint: bundled!.situation.fingerprint,
        urgency: bundled!.urgency,
        expiresAt: bundled!.situation.expiresAt,
        allowedChannels: ['MOBILE_PUSH', 'VOICE_HOME', 'SILENT_FEED'],
        correlationId: 'corr-candidate',
      }),
    );
  });
});
