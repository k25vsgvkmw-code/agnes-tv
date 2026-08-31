import type { Clock } from '../kernel/clock.js';
import type { HouseholdId } from '../kernel/ids.js';
import type { ContextStore } from './context-store.js';
import { createEmptyHouseholdContext, type HouseholdContext } from './household-context.js';

export class InMemoryContextStore implements ContextStore {
  private readonly contexts = new Map<HouseholdId, HouseholdContext>();

  constructor(private readonly clock: Clock) {}

  get(householdId: HouseholdId): Promise<HouseholdContext> {
    return Promise.resolve(
      this.contexts.get(householdId) ?? createEmptyHouseholdContext(householdId, this.clock.now()),
    );
  }

  save(context: HouseholdContext): Promise<void> {
    this.contexts.set(context.householdId, context);
    return Promise.resolve();
  }
}
