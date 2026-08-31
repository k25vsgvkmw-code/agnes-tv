import { ValidationError } from '../kernel/errors.js';
import { newPersonId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export type PersonRole = 'adult' | 'child' | 'guest';
export type PersonStatus = 'active' | 'inactive';

export interface Person {
  readonly id: PersonId;
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: PersonRole;
  readonly birthDate: string | null;
  readonly locale: string;
  readonly timezone: string;
  readonly permissionsProfileId: string;
  readonly status: PersonStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePersonInput {
  readonly id?: PersonId;
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: PersonRole;
  readonly birthDate?: string | null;
  readonly locale: string;
  readonly timezone: string;
  readonly permissionsProfileId: string;
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

export function createPerson(input: CreatePersonInput): Person {
  const now = new Date();

  return Object.freeze({
    id: input.id ?? newPersonId(),
    householdId: input.householdId,
    displayName: required(input.displayName, 'displayName'),
    role: input.role,
    birthDate: input.birthDate ?? null,
    locale: required(input.locale, 'locale'),
    timezone: validTimezone(input.timezone),
    permissionsProfileId: required(input.permissionsProfileId, 'permissionsProfileId'),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
}
