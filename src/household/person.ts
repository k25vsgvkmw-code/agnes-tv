import { ValidationError } from '../kernel/errors.js';
import { newPersonId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export type PersonRole = 'adult' | 'child' | 'guest';
export type PersonStatus = 'active' | 'inactive';

export interface Person {
  readonly id: PersonId;
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: PersonRole;
  readonly locale: string;
  readonly timezone: string;
  readonly status: PersonStatus;
}

export interface CreatePersonInput {
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: PersonRole;
  readonly locale: string;
  readonly timezone: string;
}

function requireText(field: 'displayName' | 'locale' | 'timezone', value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required`, { field });
  }
  return normalized;
}

export function createPerson(input: CreatePersonInput): Person {
  return {
    id: newPersonId(),
    householdId: input.householdId,
    displayName: requireText('displayName', input.displayName),
    role: input.role,
    locale: requireText('locale', input.locale),
    timezone: requireText('timezone', input.timezone),
    status: 'active',
  };
}
