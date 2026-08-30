import type { HouseholdContext } from './household-context.js';
import type { HouseholdId } from '../kernel/ids.js';

export interface ContextStore {
  get(householdId: HouseholdId): Promise<HouseholdContext | null>;
  put(context: HouseholdContext): Promise<void>;
}
