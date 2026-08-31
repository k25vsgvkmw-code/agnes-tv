import { ValidationError } from '../kernel/errors.js';
import { newHouseholdId, type HouseholdId } from '../kernel/ids.js';

export type HouseholdStatus = 'active' | 'inactive';

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
  readonly id?: HouseholdId;
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
  readonly homeLocationId?: string | null;
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return normalized;
}

function validTimezone(value: string): string {
  const timezone = required(value, 'timezone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
  } catch (error) {
    throw new ValidationError('timezone must be a valid IANA timezone', { cause: error });
  }
  return timezone;
}

export function createHousehold(input: CreateHouseholdInput): Household {
  const now = new Date();

  return Object.freeze({
    id: input.id ?? newHouseholdId(),
    name: required(input.name, 'name'),
    timezone: validTimezone(input.timezone),
    locale: required(input.locale, 'locale'),
    homeLocationId: input.homeLocationId ?? null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
}
