import { ValidationError } from '../kernel/errors.js';
import { newHouseholdId, type HouseholdId } from '../kernel/ids.js';

export type HouseholdStatus = 'active' | 'inactive';

export interface Household {
  readonly id: HouseholdId;
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
  readonly status: HouseholdStatus;
}

export interface CreateHouseholdInput {
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
}

function requireText(field: keyof CreateHouseholdInput, value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required`, { field });
  }
  return normalized;
}

export function createHousehold(input: CreateHouseholdInput): Household {
  return {
    id: newHouseholdId(),
    name: requireText('name', input.name),
    timezone: requireText('timezone', input.timezone),
    locale: requireText('locale', input.locale),
    status: 'active',
  };
}
