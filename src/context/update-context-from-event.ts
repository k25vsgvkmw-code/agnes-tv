import type { CalendarEvent } from '../calendar/calendar-event.js';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { DeviceId, HouseholdId, PersonId } from '../kernel/ids.js';
import type { PresenceEvidenceSource, PresenceState, PresenceStateName } from '../presence/presence-state.js';
import { createTravelCondition, type TravelCondition } from '../routing/travel-condition.js';
import { createWeatherSnapshot, type WeatherSnapshot } from '../weather/weather-snapshot.js';
import type { ContextStore } from './context-store.js';
import {
  emptyHouseholdContext,
  type DeviceStateContext,
  type HouseholdContext,
} from './household-context.js';

type UnknownRecord = Record<string, unknown>;

const PRESENCE_STATES = new Set<PresenceStateName>([
  'PRESENT',
  'AWAY',
  'ARRIVING',
  'LEAVING',
  'UNKNOWN',
]);
const PRESENCE_SOURCES = new Set<PresenceEvidenceSource>([
  'MANUAL',
  'LOCATION',
  'HOME_WIFI',
  'NEARBY',
  'INTERACTION',
  'CALENDAR',
]);

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readCalendarEvent(event: AgnesEvent): CalendarEvent | null {
  if (event.type !== 'calendar.event.created.v1') {
    return null;
  }

  const payload = asRecord(event.payload);
  const raw = asRecord(payload?.calendarEvent);
  const externalReference = asRecord(raw?.externalReference);
  if (raw === null || externalReference === null) {
    return null;
  }

  const startsAt = asDate(raw.startsAt);
  const endsAt = asDate(raw.endsAt);
  const lastSyncedAt = asDate(externalReference.lastSyncedAt);
  if (startsAt === null || endsAt === null || lastSyncedAt === null) {
    return null;
  }

  if (
    typeof raw.id !== 'string' ||
    typeof raw.householdId !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.timezone !== 'string' ||
    raw.status !== 'confirmed' ||
    typeof externalReference.id !== 'string' ||
    typeof externalReference.provider !== 'string' ||
    typeof externalReference.externalId !== 'string' ||
    typeof externalReference.authoritative !== 'boolean'
  ) {
    return null;
  }

  return {
    id: raw.id as CalendarEvent['id'],
    householdId: raw.householdId as CalendarEvent['householdId'],
    title: raw.title,
    startsAt,
    endsAt,
    timezone: raw.timezone,
    status: 'confirmed',
    externalReference: {
      id: externalReference.id as CalendarEvent['externalReference']['id'],
      provider: externalReference.provider,
      externalId: externalReference.externalId,
      lastSyncedAt,
      authoritative: externalReference.authoritative,
      ...(typeof externalReference.externalVersion === 'string'
        ? { externalVersion: externalReference.externalVersion }
        : {}),
      ...(typeof externalReference.etag === 'string' ? { etag: externalReference.etag } : {}),
      ...(typeof externalReference.syncToken === 'string'
        ? { syncToken: externalReference.syncToken }
        : {}),
    },
  };
}

function readWeatherSnapshot(event: AgnesEvent): WeatherSnapshot | null {
  if (event.type !== 'weather.snapshot.updated.v1') return null;

  const payload = asRecord(event.payload);
  const raw = asRecord(payload?.weatherSnapshot);
  if (raw === null) return null;

  const observedAt = asDate(raw.observedAt);
  const expiresAt = asDate(raw.expiresAt);
  const temperatureC = asFiniteNumber(raw.temperatureC);
  const feelsLikeC = asFiniteNumber(raw.feelsLikeC);
  const rainProbability = asFiniteNumber(raw.rainProbability);
  const precipitationMm = asFiniteNumber(raw.precipitationMm);
  const windSpeedKmh = asFiniteNumber(raw.windSpeedKmh);
  const windGustKmh = asFiniteNumber(raw.windGustKmh);
  const humidity = asFiniteNumber(raw.humidity);
  const visibilityKm = asFiniteNumber(raw.visibilityKm);
  const uvIndex = asFiniteNumber(raw.uvIndex);
  const confidence = asFiniteNumber(raw.confidence);

  if (
    observedAt === null ||
    expiresAt === null ||
    temperatureC === null ||
    feelsLikeC === null ||
    rainProbability === null ||
    precipitationMm === null ||
    windSpeedKmh === null ||
    windGustKmh === null ||
    humidity === null ||
    visibilityKm === null ||
    uvIndex === null ||
    confidence === null ||
    typeof raw.householdId !== 'string' ||
    typeof raw.placeId !== 'string' ||
    typeof raw.condition !== 'string' ||
    typeof raw.source !== 'string'
  ) {
    return null;
  }

  try {
    return createWeatherSnapshot({
      householdId: raw.householdId as HouseholdId,
      placeId: raw.placeId,
      observedAt,
      expiresAt,
      temperatureC,
      feelsLikeC,
      condition: raw.condition,
      rainProbability,
      precipitationMm,
      windSpeedKmh,
      windGustKmh,
      humidity,
      visibilityKm,
      uvIndex,
      source: raw.source,
      confidence,
    });
  } catch {
    return null;
  }
}

function readTravelCondition(event: AgnesEvent): TravelCondition | null {
  if (event.type !== 'travel.conditions.updated.v1') return null;

  const payload = asRecord(event.payload);
  const raw = asRecord(payload?.travelCondition);
  if (raw === null) return null;

  const observedAt = asDate(raw.observedAt);
  const expiresAt = asDate(raw.expiresAt);
  const durationMinutes = asFiniteNumber(raw.durationMinutes);
  const distanceKm = asFiniteNumber(raw.distanceKm);
  const trafficDelayMinutes = asFiniteNumber(raw.trafficDelayMinutes);
  const confidence = asFiniteNumber(raw.confidence);

  if (
    observedAt === null ||
    expiresAt === null ||
    durationMinutes === null ||
    distanceKm === null ||
    trafficDelayMinutes === null ||
    confidence === null ||
    typeof raw.source !== 'string'
  ) {
    return null;
  }

  try {
    return createTravelCondition({
      observedAt,
      expiresAt,
      durationMinutes,
      distanceKm,
      trafficDelayMinutes,
      source: raw.source,
      confidence,
    });
  } catch {
    return null;
  }
}

interface PresenceChange {
  readonly personId: PersonId;
  readonly presence: PresenceState;
}

function readPresenceChange(event: AgnesEvent): PresenceChange | null {
  if (event.type !== 'person.presence.changed.v1') return null;

  const payload = asRecord(event.payload);
  const raw = asRecord(payload?.presence);
  if (raw === null || typeof payload?.personId !== 'string') return null;
  if (typeof raw.state !== 'string' || !PRESENCE_STATES.has(raw.state as PresenceStateName)) {
    return null;
  }

  const confidence = asFiniteNumber(raw.confidence);
  if (confidence === null || confidence < 0 || confidence > 1 || !Array.isArray(raw.sources)) {
    return null;
  }

  const sources: PresenceEvidenceSource[] = [];
  for (const source of raw.sources) {
    if (typeof source !== 'string' || !PRESENCE_SOURCES.has(source as PresenceEvidenceSource)) {
      return null;
    }
    sources.push(source as PresenceEvidenceSource);
  }

  let expiresAt: Date | undefined;
  if (raw.expiresAt !== undefined) {
    const parsed = asDate(raw.expiresAt);
    if (parsed === null) return null;
    expiresAt = parsed;
  }

  return {
    personId: payload.personId as PersonId,
    presence: {
      state: raw.state as PresenceStateName,
      confidence,
      sources,
      ...(expiresAt === undefined ? {} : { expiresAt }),
    },
  };
}

function readDeviceState(event: AgnesEvent): DeviceStateContext | null {
  if (event.type !== 'device.heartbeat.v1') return null;

  const payload = asRecord(event.payload);
  const raw = asRecord(payload?.deviceState);
  if (raw === null || typeof raw.id !== 'string') return null;

  const lastHeartbeatAt = asDate(raw.lastHeartbeatAt);
  if (lastHeartbeatAt === null) return null;

  return {
    id: raw.id as DeviceId,
    lastHeartbeatAt,
  };
}

async function getContext(event: AgnesEvent, store: ContextStore): Promise<HouseholdContext> {
  return (await store.get(event.householdId)) ?? emptyHouseholdContext(event.householdId, event.occurredAt);
}

function withoutPerson(people: readonly PersonId[], personId: PersonId): PersonId[] {
  return people.filter((candidate) => candidate !== personId);
}

export async function updateContextFromEvent(
  event: AgnesEvent,
  store: ContextStore,
): Promise<void> {
  if (event.type === 'calendar.event.created.v1') {
    const calendarEvent = readCalendarEvent(event);
    if (calendarEvent === null) return;
    const context = await getContext(event, store);

    await store.put({
      ...context,
      timestamp: new Date(event.occurredAt),
      upcomingEvents: [...context.upcomingEvents, calendarEvent],
    });
    return;
  }

  if (event.type === 'weather.snapshot.updated.v1') {
    const weatherSnapshot = readWeatherSnapshot(event);
    if (weatherSnapshot === null) return;
    const context = await getContext(event, store);

    await store.put({
      ...context,
      timestamp: new Date(event.occurredAt),
      currentWeather: weatherSnapshot,
    });
    return;
  }

  if (event.type === 'travel.conditions.updated.v1') {
    const travelCondition = readTravelCondition(event);
    if (travelCondition === null) return;
    const context = await getContext(event, store);

    await store.put({
      ...context,
      timestamp: new Date(event.occurredAt),
      travelConditions: travelCondition,
    });
    return;
  }

  if (event.type === 'person.presence.changed.v1') {
    const change = readPresenceChange(event);
    if (change === null) return;
    const context = await getContext(event, store);
    const peoplePresent = withoutPerson(context.peoplePresent, change.personId);
    const peopleAway = withoutPerson(context.peopleAway, change.personId);

    await store.put({
      ...context,
      timestamp: new Date(event.occurredAt),
      presenceByPerson: {
        ...context.presenceByPerson,
        [change.personId]: change.presence,
      },
      peoplePresent:
        change.presence.state === 'PRESENT' ? [...peoplePresent, change.personId] : peoplePresent,
      peopleAway: change.presence.state === 'AWAY' ? [...peopleAway, change.personId] : peopleAway,
    });
    return;
  }

  if (event.type === 'device.heartbeat.v1') {
    const deviceState = readDeviceState(event);
    if (deviceState === null) return;
    const context = await getContext(event, store);

    await store.put({
      ...context,
      timestamp: new Date(event.occurredAt),
      deviceStates: [
        ...context.deviceStates.filter((candidate) => candidate.id !== deviceState.id),
        deviceState,
      ],
    });
  }
}
