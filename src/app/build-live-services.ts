import type { Pool } from 'pg';
import type { AutomationCandidate } from '../automations/automation-candidate.js';
import { evaluateLiveAutomation } from '../automations/evaluate-live-automation.js';
import type { CalendarEventId, EventId, HouseholdId, PersonId } from '../kernel/ids.js';
import type { Clock } from '../kernel/clock.js';
import type { ContextStore } from '../context/context-store.js';
import { updateContextFromEvent } from '../context/update-context-from-event.js';
import type { DomainEventBus } from '../events/domain-event-bus.js';
import { createAgnesEvent } from '../events/agnes-event.js';
import { AgnesError } from '../kernel/errors.js';
import type { LocationSignalPort } from '../location/location-signal-port.js';
import type { LocationSignal } from '../location/location-signal.js';
import type { DeliveryChannel } from '../notifications/delivery-channel.js';
import type { PresenceEvidence, PresenceState, PresenceStateName } from '../presence/presence-state.js';
import { resolvePresence } from '../presence/presence-resolver.js';
import { PostgresDeviceRepository } from '../persistence/postgres-device-repository.js';
import { PostgresOfflineCommandRepository } from '../persistence/postgres-offline-command-repository.js';
import { PostgresPushTokenRepository } from '../persistence/postgres-push-token-repository.js';
import type { RouteRequest, RoutingPort } from '../routing/routing-port.js';
import type { TravelCondition } from '../routing/travel-condition.js';
import { InMemoryActiveSituationStore } from '../situations/in-memory-active-situation-store.js';
import {
  bundleDeparturePreparation,
  type BundledDeparturePreparation,
} from '../situations/departure-preparation-bundler.js';
import type { LiveSituation } from '../situations/live-situation.js';
import type { WeatherPort, WeatherQuery } from '../weather/weather-port.js';
import type { WeatherSnapshot } from '../weather/weather-snapshot.js';

export interface BuildLiveServicesConfig {
  readonly database: Pool;
  readonly clock: Clock;
  readonly domainEventBus: DomainEventBus;
  readonly contextStore: ContextStore;
  readonly weatherPort?: WeatherPort;
  readonly locationSignalPort?: LocationSignalPort;
  readonly routingPort?: RoutingPort;
}

export type SyncWeatherInput = WeatherQuery & {
  readonly correlationId?: string;
  readonly causationId?: EventId;
};

export interface IngestLocationSignalInput {
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly signal: LocationSignal;
  readonly correlationId?: string;
  readonly causationId?: EventId;
}

export interface RefreshRouteInput {
  readonly householdId: HouseholdId;
  readonly request: RouteRequest;
  readonly correlationId?: string;
  readonly causationId?: EventId;
}

export interface EvaluateDeparturePreparationInput {
  readonly householdId: HouseholdId;
  readonly targetPersonId: PersonId;
  readonly eventId?: CalendarEventId;
  readonly departureBufferMinutes: number;
  readonly correlationId?: string;
  readonly allowedChannels?: readonly DeliveryChannel[];
}

export interface DeparturePreparationEvaluation extends BundledDeparturePreparation {
  readonly situation: LiveSituation;
  readonly candidate: AutomationCandidate;
}

const DEFAULT_DEPARTURE_CHANNELS: readonly DeliveryChannel[] = [
  'MOBILE_PUSH',
  'VOICE_HOME',
  'SILENT_FEED',
];

function presenceName(signal: LocationSignal): PresenceStateName {
  if (signal.semanticPlace === 'HOME') return 'PRESENT';
  if (
    signal.semanticPlace === 'WORK' ||
    signal.semanticPlace === 'SCHOOL' ||
    signal.semanticPlace === 'ACTIVITY' ||
    signal.semanticPlace === 'OTHER_SAVED_PLACE'
  ) {
    return 'AWAY';
  }
  return 'UNKNOWN';
}

function locationEvidence(signal: LocationSignal): PresenceEvidence {
  return {
    source: signal.source === 'MANUAL' ? 'MANUAL' : 'LOCATION',
    state: presenceName(signal),
    observedAt: new Date(signal.observedAt),
    expiresAt: new Date(signal.expiresAt),
    confidence:
      signal.source === 'MANUAL' ? 1 : signal.source === 'DEVICE_GEOFENCE' ? 0.95 : 0.9,
  };
}

function optionalEventMetadata(input: {
  readonly correlationId?: string;
  readonly causationId?: EventId;
}) {
  return {
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.causationId === undefined ? {} : { causationId: input.causationId }),
  };
}

export function buildLiveServices(config: BuildLiveServicesConfig) {
  const deviceRepository = new PostgresDeviceRepository(config.database);
  const pushTokenRepository = new PostgresPushTokenRepository(config.database);
  const offlineCommandRepository = new PostgresOfflineCommandRepository(config.database);
  const activeSituationStore = new InMemoryActiveSituationStore();

  const liveEventTypes = [
    'weather.snapshot.updated.v1',
    'travel.conditions.updated.v1',
    'person.presence.changed.v1',
    'device.heartbeat.v1',
  ] as const;
  const unsubscribe = liveEventTypes.map((eventType) =>
    config.domainEventBus.subscribe(eventType, async (event) => {
      await updateContextFromEvent(event, config.contextStore);
    }),
  );

  async function syncWeather(input: SyncWeatherInput): Promise<WeatherSnapshot> {
    if (config.weatherPort === undefined) {
      throw new AgnesError('WEATHER_PROVIDER_UNAVAILABLE', 'Weather provider is unavailable');
    }

    const snapshot = await config.weatherPort.getCurrent(input);
    await config.domainEventBus.publish(
      createAgnesEvent({
        type: 'weather.snapshot.updated.v1',
        version: 1,
        occurredAt: snapshot.observedAt,
        receivedAt: config.clock.now(),
        source: snapshot.source,
        householdId: input.householdId,
        entityType: 'weather_snapshot',
        entityId: snapshot.placeId,
        payload: { weatherSnapshot: snapshot },
        metadata: {},
        ...optionalEventMetadata(input),
      }),
    );
    return snapshot;
  }

  async function ingestLocationSignal(input: IngestLocationSignalInput): Promise<PresenceState> {
    const device = await deviceRepository.get(input.signal.deviceId);
    if (device === null) {
      throw new AgnesError('DEVICE_NOT_FOUND', 'Location signal device was not found', {
        deviceId: input.signal.deviceId,
      });
    }
    if (device.revokedAt !== undefined) {
      throw new AgnesError('DEVICE_REVOKED', 'Location signal device is revoked', {
        deviceId: input.signal.deviceId,
      });
    }
    if (device.householdId !== input.householdId) {
      throw new AgnesError('DEVICE_HOUSEHOLD_MISMATCH', 'Device does not belong to the household');
    }
    if (device.ownerPersonId !== undefined && device.ownerPersonId !== input.personId) {
      throw new AgnesError('DEVICE_PERSON_MISMATCH', 'Device does not belong to the target person');
    }

    if (config.locationSignalPort !== undefined) {
      await config.locationSignalPort.ingest(input.signal);
    }

    const presence = resolvePresence([locationEvidence(input.signal)], config.clock.now());
    await config.domainEventBus.publish(
      createAgnesEvent({
        type: 'person.presence.changed.v1',
        version: 1,
        occurredAt: input.signal.observedAt,
        receivedAt: config.clock.now(),
        source: input.signal.source,
        householdId: input.householdId,
        actorId: input.personId,
        entityType: 'person',
        entityId: input.personId,
        payload: { personId: input.personId, presence },
        metadata: { deviceId: input.signal.deviceId },
        ...optionalEventMetadata(input),
      }),
    );
    return presence;
  }

  async function refreshRoute(input: RefreshRouteInput): Promise<TravelCondition> {
    if (config.routingPort === undefined) {
      throw new AgnesError('ROUTING_PROVIDER_UNAVAILABLE', 'Routing provider is unavailable');
    }

    const travelCondition = await config.routingPort.getRoute(input.request);
    await config.domainEventBus.publish(
      createAgnesEvent({
        type: 'travel.conditions.updated.v1',
        version: 1,
        occurredAt: travelCondition.observedAt,
        receivedAt: config.clock.now(),
        source: travelCondition.source,
        householdId: input.householdId,
        entityType: 'travel_condition',
        payload: { travelCondition },
        metadata: {},
        ...optionalEventMetadata(input),
      }),
    );
    return travelCondition;
  }

  async function evaluateDeparturePreparation(
    input: EvaluateDeparturePreparationInput,
  ): Promise<DeparturePreparationEvaluation | null> {
    const context = await config.contextStore.get(input.householdId);
    if (context === null) return null;

    const event = input.eventId === undefined
      ? [...context.upcomingEvents]
          .filter((candidate) => candidate.startsAt.getTime() > config.clock.now().getTime())
          .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0]
      : context.upcomingEvents.find((candidate) => candidate.id === input.eventId);
    if (event === undefined) return null;

    const presence = context.presenceByPerson[input.targetPersonId];
    if (presence === undefined) return null;

    const bundled = bundleDeparturePreparation({
      householdId: input.householdId,
      targetPersonId: input.targetPersonId,
      event,
      presence,
      ...(context.travelConditions === undefined ? {} : { route: context.travelConditions }),
      ...(context.currentWeather === undefined ? {} : { weather: context.currentWeather }),
      now: config.clock.now(),
      departureBufferMinutes: input.departureBufferMinutes,
      ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    });
    if (bundled === undefined) return null;

    const situation = await activeSituationStore.upsert(bundled.situation);
    const candidate = evaluateLiveAutomation({
      situation,
      targetPersonId: input.targetPersonId,
      title: 'Ώρα να ετοιμαστείτε',
      message: bundled.message,
      urgency: bundled.urgency,
      allowedChannels: input.allowedChannels ?? DEFAULT_DEPARTURE_CHANNELS,
    });

    return {
      ...bundled,
      situation,
      candidate,
    };
  }

  return {
    deviceRepository,
    pushTokenRepository,
    offlineCommandRepository,
    activeSituationStore,
    syncWeather,
    ingestLocationSignal,
    refreshRoute,
    evaluateDeparturePreparation,
    dispose(): void {
      for (const stop of unsubscribe) stop();
    },
  };
}
