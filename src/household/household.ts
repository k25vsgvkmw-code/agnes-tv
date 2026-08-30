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
  readonly id?: HouseholdId;
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
}

export function createHousehold(input: CreateHouseholdInput): Household {
  const name = input.name.trim();
  const timezone = input.timezone.trim();
  const locale = input.locale.trim();

  if (!name) {
    throw new ValidationError('household name is required');
  }
  if (!timezone) {
    throw new ValidationError('household timezone is required');
  }
  if (!locale) {
    throw new ValidationError('household locale is required');
  }

  return {
    id: input.id ?? newHouseholdId(),
    name,
    timezone,
    locale,
    status: 'active',
  };
}
