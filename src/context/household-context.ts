import type { CalendarEvent } from '../calendar/calendar-event.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

export interface ContextTask {
  readonly id: string;
}

export interface WeatherContext {
  readonly observedAt: Date;
}

export interface TravelConditionsContext {
  readonly observedAt: Date;
}

export interface RoutineContext {
  readonly id: string;
}

export interface DeviceStateContext {
  readonly id: string;
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

export interface HouseholdContext {
  readonly householdId: HouseholdId;
  readonly timestamp: Date;
  readonly peoplePresent: readonly PersonId[];
  readonly peopleAway: readonly PersonId[];
  readonly activeEvents: readonly CalendarEvent[];
  readonly upcomingEvents: readonly CalendarEvent[];
  readonly activeTasks: readonly ContextTask[];
  readonly urgentTasks: readonly ContextTask[];
  readonly currentWeather?: WeatherContext;
  readonly travelConditions?: TravelConditionsContext;
  readonly activeRoutines: readonly RoutineContext[];
  readonly deviceStates: readonly DeviceStateContext[];
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
    activeEvents: [],
    upcomingEvents: [],
    activeTasks: [],
    urgentTasks: [],
    activeRoutines: [],
    deviceStates: [],
    openNotifications: [],
    attentionStates: [],
    detectedSituations: [],
  };
}
