import { ValidationError } from '../kernel/errors.js';
import { newHouseholdId, type HouseholdId } from '../kernel/ids.js';

export type HouseholdStatus = 'active' | 'inactive' | 'archived';

export interface Household {
  readonly id: HouseholdId;
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
  readonly homeLocationId: string | null;
  readonly status: HouseholdStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateHouseholdInput {
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
  readonly homeLocationId?: string;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`household ${field} is required`);
  }
  return normalized;
}

export function createHousehold(input: CreateHouseholdInput): Household {
  const now = new Date();

  return {
    id: newHouseholdId(),
    name: requireText(input.name, 'name'),
    timezone: requireText(input.timezone, 'timezone'),
    locale: requireText(input.locale, 'locale'),
    homeLocationId: input.homeLocationId?.trim() || null,
    status: 'active',
    createdAt: now,
    updatedAt: new Date(now),
  };
}
