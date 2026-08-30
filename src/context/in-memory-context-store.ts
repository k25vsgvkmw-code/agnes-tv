import type { ContextStore } from './context-store.js';
import type { HouseholdContext } from './household-context.js';
import type { HouseholdId } from '../kernel/ids.js';

export class InMemoryContextStore implements ContextStore {
  private readonly contexts = new Map<HouseholdId, HouseholdContext>();

  async get(householdId: HouseholdId): Promise<HouseholdContext | null> {
    return this.contexts.get(householdId) ?? null;
  }

  async put(context: HouseholdContext): Promise<void> {
    this.contexts.set(context.householdId, context);
  }
}
