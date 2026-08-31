import type { CalendarEventId, HouseholdId, PersonId } from '../kernel/ids.js';

export interface ContextCalendarEvent {
  readonly id: CalendarEventId;
  readonly householdId: HouseholdId;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly status: string;
}

export interface ContextTask {
  readonly id: string;
  readonly title: string;
}

export interface ContextWeather {
  readonly observedAt: Date;
  readonly summary: string;
}

export interface ContextTravelConditions {
  readonly observedAt: Date;
  readonly summary: string;
}

export interface ContextRoutine {
  readonly id: string;
  readonly state: string;
}

export interface ContextDeviceState {
  readonly id: string;
  readonly state: string;
}

export interface ContextNotification {
  readonly id: string;
  readonly state: string;
}

export interface ContextAttentionState {
  readonly personId: PersonId;
  readonly state: string;
}

export interface ContextSituation {
  readonly id: string;
  readonly type: string;
  readonly confidence: number;
}

export interface HouseholdContext {
  readonly householdId: HouseholdId;
  readonly updatedAt: Date;
  readonly peoplePresent: readonly PersonId[];
  readonly peopleAway: readonly PersonId[];
  readonly activeEvents: readonly ContextCalendarEvent[];
  readonly upcomingEvents: readonly ContextCalendarEvent[];
  readonly activeTasks: readonly ContextTask[];
  readonly urgentTasks: readonly ContextTask[];
  readonly currentWeather: ContextWeather | null;
  readonly travelConditions: ContextTravelConditions | null;
  readonly activeRoutines: readonly ContextRoutine[];
  readonly deviceStates: readonly ContextDeviceState[];
  readonly openNotifications: readonly ContextNotification[];
  readonly attentionStates: readonly ContextAttentionState[];
  readonly detectedSituations: readonly ContextSituation[];
}

export function createEmptyHouseholdContext(
  householdId: HouseholdId,
  updatedAt: Date,
): HouseholdContext {
  return {
    householdId,
    updatedAt: new Date(updatedAt),
    peoplePresent: [],
    peopleAway: [],
    activeEvents: [],
    upcomingEvents: [],
    activeTasks: [],
    urgentTasks: [],
    currentWeather: null,
    travelConditions: null,
    activeRoutines: [],
    deviceStates: [],
    openNotifications: [],
    attentionStates: [],
    detectedSituations: [],
  };
}
