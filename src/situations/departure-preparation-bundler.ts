import type { CalendarEvent } from '../calendar/calendar-event.js';
import { newSituationId, type HouseholdId, type PersonId } from '../kernel/ids.js';
import type { PresenceState } from '../presence/presence-state.js';
import type { TravelCondition } from '../routing/travel-condition.js';
import type { WeatherSnapshot } from '../weather/weather-snapshot.js';
import type { LiveSituation } from './live-situation.js';
import { createSituationFingerprint } from './situation-fingerprint.js';
import type { SituationSupportingFactor } from './situation.js';

export interface BundleDeparturePreparationInput {
  readonly householdId: HouseholdId;
  readonly targetPersonId: PersonId;
  readonly event: CalendarEvent;
  readonly presence: PresenceState;
  readonly route?: TravelCondition;
  readonly weather?: WeatherSnapshot;
  readonly now: Date;
  readonly departureBufferMinutes: number;
  readonly correlationId?: string;
}

export interface BundledDeparturePreparation {
  readonly situation: LiveSituation;
  readonly requiredDepartureAt?: Date;
  readonly minutesEarly?: number;
  readonly message: string;
  readonly urgency: number;
}

function isFresh(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() > now.getTime();
}

function isPresentAndFresh(presence: PresenceState, now: Date): boolean {
  if (presence.state !== 'PRESENT') return false;
  return presence.expiresAt === undefined || isFresh(presence.expiresAt, now);
}

function routeUrgency(requiredDepartureAt: Date | undefined, now: Date): number {
  if (requiredDepartureAt === undefined) return 0.6;
  const minutesUntilDeparture = (requiredDepartureAt.getTime() - now.getTime()) / 60_000;
  if (minutesUntilDeparture <= 0) return 0.9;
  if (minutesUntilDeparture <= 10) return 0.8;
  return 0.7;
}

function buildMessage(minutesEarly: number | undefined, rainExpected: boolean): string {
  if (minutesEarly !== undefined) {
    const base = `Φύγετε περίπου ${minutesEarly} λεπτά νωρίτερα`;
    return rainExpected ? `${base}· αναμένεται βροχή.` : `${base}.`;
  }
  return rainExpected ? 'Αναμένεται βροχή.' : 'Ελέγξτε την αναχώρηση για το επόμενο γεγονός.';
}

export function bundleDeparturePreparation(
  input: BundleDeparturePreparationInput,
): BundledDeparturePreparation | undefined {
  const now = new Date(input.now);
  if (!isPresentAndFresh(input.presence, now)) return undefined;
  if (input.event.householdId !== input.householdId) return undefined;
  if (input.event.startsAt.getTime() <= now.getTime()) return undefined;

  const relatedEntities = [
    { type: 'calendar_event', id: input.event.id },
    { type: 'person', id: input.targetPersonId },
  ] as const;
  const supportingFactors: SituationSupportingFactor[] = [
    { name: 'presence_state', value: 'PRESENT' },
  ];

  const freshRoute = input.route !== undefined && isFresh(input.route.expiresAt, now) ? input.route : undefined;
  let requiredDepartureAt: Date | undefined;
  let minutesEarly: number | undefined;

  if (freshRoute !== undefined) {
    minutesEarly = freshRoute.durationMinutes + input.departureBufferMinutes;
    requiredDepartureAt = new Date(input.event.startsAt.getTime() - minutesEarly * 60_000);
    supportingFactors.push(
      { name: 'route_minutes', value: freshRoute.durationMinutes },
      { name: 'required_departure_at', value: requiredDepartureAt.toISOString() },
      { name: 'traffic_delay_minutes', value: freshRoute.trafficDelayMinutes },
    );
  }

  const freshWeather =
    input.weather !== undefined &&
    input.weather.householdId === input.householdId &&
    isFresh(input.weather.expiresAt, now)
      ? input.weather
      : undefined;
  const rainExpected = freshWeather !== undefined && freshWeather.rainProbability >= 0.5;
  if (freshWeather !== undefined) {
    supportingFactors.push({ name: 'rain_probability', value: freshWeather.rainProbability });
  }

  const urgency = routeUrgency(requiredDepartureAt, now);
  const fingerprint = createSituationFingerprint({
    householdId: input.householdId,
    type: 'DEPARTURE_PREPARATION',
    relatedEntities,
    timeWindow: {
      startsAt: input.event.startsAt,
      endsAt: input.event.endsAt,
    },
  });
  const confidenceCandidates = [input.presence.confidence];
  if (freshRoute !== undefined) confidenceCandidates.push(freshRoute.confidence);
  if (freshWeather !== undefined) confidenceCandidates.push(freshWeather.confidence);
  const confidence = Math.min(...confidenceCandidates);

  const situationBase = {
    id: newSituationId(),
    householdId: input.householdId,
    fingerprint,
    type: 'DEPARTURE_PREPARATION' as const,
    state: 'DETECTED' as const,
    confidence,
    relatedEntities,
    supportingFactors,
    detectedAt: now,
    updatedAt: now,
    expiresAt: new Date(input.event.startsAt),
  };
  const situation: LiveSituation = {
    ...situationBase,
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
  };
  const resultBase = {
    situation,
    message: buildMessage(minutesEarly, rainExpected),
    urgency,
  };

  return {
    ...resultBase,
    ...(requiredDepartureAt === undefined ? {} : { requiredDepartureAt }),
    ...(minutesEarly === undefined ? {} : { minutesEarly }),
  };
}
