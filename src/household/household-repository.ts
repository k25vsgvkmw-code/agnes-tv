import type { Household } from './household.js';
import type { Person } from './person.js';
import type { HouseholdId } from '../kernel/ids.js';

export interface HouseholdRepository {
  saveHousehold(household: Household): Promise<void>;
  savePerson(person: Person): Promise<void>;
  getHousehold(id: HouseholdId): Promise<Household | null>;
  listPeople(householdId: HouseholdId): Promise<readonly Person[]>;
}
