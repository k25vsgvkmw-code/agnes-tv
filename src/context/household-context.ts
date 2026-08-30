import type { CalendarEvent } from '../calendar/calendar-event.js';
import type { DeviceId, HouseholdId, PersonId } from '../kernel/ids.js';
import type { PresenceState } from '../presence/presence-state.js';
import type { TravelCondition } from '../routing/travel-condition.js';
import type { WeatherSnapshot } from '../weather/weather-snapshot.js';

export interface ContextTask {
  readonly id: string;
}

export interface RoutineContext {
  readonly id: string;
}

export interface DeviceStateContext {
  readonly id: DeviceId;
  readonly lastHeartbeatAt: Date;
}

export interface NotificationContext {
  readonly id: string;
}

export interface AttentionStateContext {
  readonly id: string;
}

export interface DetectedSituationContext {
  readonly type: string;
}

export interface LiveSituation {
  readonly id: string;
  readonly type: string;
  readonly observedAt: Date;
  readonly expiresAt?: Date;
}

export interface HouseholdContext {
  readonly householdId: HouseholdId;
  readonly timestamp: Date;
  readonly peoplePresent: readonly PersonId[];
  readonly peopleAway: readonly PersonId[];
  readonly presenceByPerson: Readonly<Record<string, PresenceState>>;
  readonly activeEvents: readonly CalendarEvent[];
  readonly upcomingEvents: readonly CalendarEvent[];
  readonly activeTasks: readonly ContextTask[];
  readonly urgentTasks: readonly ContextTask[];
  readonly currentWeather?: WeatherSnapshot;
  readonly travelConditions?: TravelCondition;
  readonly activeRoutines: readonly RoutineContext[];
  readonly deviceStates: readonly DeviceStateContext[];
  readonly activeSituations: readonly LiveSituation[];
  readonly openNotifications: readonly NotificationContext[];
  readonly attentionStates: readonly AttentionStateContext[];
  readonly detectedSituations: readonly DetectedSituationContext[];
}

export function emptyHouseholdContext(householdId: HouseholdId, timestamp: Date): HouseholdContext {
  return {
    householdId,
    timestamp: new Date(timestamp),
    peoplePresent: [],
    peopleAway: [],
    presenceByPerson: {},
    activeEvents: [],
    upcomingEvents: [],
    activeTasks: [],
    urgentTasks: [],
    activeRoutines: [],
    deviceStates: [],
    activeSituations: [],
    openNotifications: [],
    attentionStates: [],
    detectedSituations: [],
  };
}
