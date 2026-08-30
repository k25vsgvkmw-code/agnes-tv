import type { HouseholdId } from '../kernel/ids.js';
import type { ContextStore } from './context-store.js';
import type { HouseholdContext } from './household-context.js';

function cloneContext(context: HouseholdContext): HouseholdContext {
  return {
    ...context,
    timestamp: new Date(context.timestamp),
    peoplePresent: [...context.peoplePresent],
    peopleAway: [...context.peopleAway],
    activeEvents: context.activeEvents.map((event) => ({
      ...event,
      startsAt: new Date(event.startsAt),
      endsAt: new Date(event.endsAt),
      participants: [...event.participants],
    })),
    upcomingEvents: context.upcomingEvents.map((event) => ({
      ...event,
      startsAt: new Date(event.startsAt),
      endsAt: new Date(event.endsAt),
      participants: [...event.participants],
    })),
    activeTasks: [...context.activeTasks],
    urgentTasks: [...context.urgentTasks],
    currentWeather: context.currentWeather === null ? null : { ...context.currentWeather },
    travelConditions:
      context.travelConditions === null ? null : { ...context.travelConditions },
    activeRoutines: [...context.activeRoutines],
    deviceStates: [...context.deviceStates],
    openNotifications: [...context.openNotifications],
    attentionStates: [...context.attentionStates],
    detectedSituations: [...context.detectedSituations],
  };
}

export class InMemoryContextStore implements ContextStore {
  readonly #contexts = new Map<HouseholdId, HouseholdContext>();

  async get(householdId: HouseholdId): Promise<HouseholdContext | null> {
    const context = this.#contexts.get(householdId);
    return context === undefined ? null : cloneContext(context);
  }

  async put(context: HouseholdContext): Promise<void> {
    this.#contexts.set(context.householdId, cloneContext(context));
  }
}
