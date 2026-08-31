import type { HouseholdId } from '../kernel/ids.js';
import type { HouseholdContext } from './household-context.js';

export interface ContextStore {
  get(householdId: HouseholdId): Promise<HouseholdContext>;
  save(context: HouseholdContext): Promise<void>;
}
