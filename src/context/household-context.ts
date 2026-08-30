import type { CalendarEventId, HouseholdId, PersonId } from '../kernel/ids.js';

export interface ContextCalendarEvent {
  readonly id: CalendarEventId;
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly participants: readonly PersonId[];
  readonly visibility: 'private' | 'household';
  readonly status: 'confirmed' | 'cancelled';
  readonly ownerPersonId?: PersonId;
  readonly description?: string;
}

export type ContextRecord = Readonly<Record<string, unknown>>;

export interface HouseholdContext {
  readonly householdId: HouseholdId;
  readonly timestamp: Date;
  readonly peoplePresent: readonly PersonId[];
  readonly peopleAway: readonly PersonId[];
  readonly activeEvents: readonly ContextCalendarEvent[];
  readonly upcomingEvents: readonly ContextCalendarEvent[];
  readonly activeTasks: readonly ContextRecord[];
  readonly urgentTasks: readonly ContextRecord[];
  readonly currentWeather: ContextRecord | null;
  readonly travelConditions: ContextRecord | null;
  readonly activeRoutines: readonly ContextRecord[];
  readonly deviceStates: readonly ContextRecord[];
  readonly openNotifications: readonly ContextRecord[];
  readonly attentionStates: readonly ContextRecord[];
  readonly detectedSituations: readonly ContextRecord[];
}

export function createEmptyHouseholdContext(
  householdId: HouseholdId,
  timestamp: Date,
): HouseholdContext {
  return {
    householdId,
    timestamp: new Date(timestamp),
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
