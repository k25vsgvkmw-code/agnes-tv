import { ValidationError } from '../kernel/errors.js';
import { newPersonId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export type PersonStatus = 'active' | 'inactive' | 'archived';

export interface Person {
  readonly id: PersonId;
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: string;
  readonly birthDate: string | null;
  readonly locale: string;
  readonly timezone: string;
  readonly permissionsProfileId: string | null;
  readonly status: PersonStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePersonInput {
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: string;
  readonly birthDate?: string;
  readonly locale: string;
  readonly timezone: string;
  readonly permissionsProfileId?: string;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`person ${field} is required`);
  }
  return normalized;
}

export function createPerson(input: CreatePersonInput): Person {
  const now = new Date();

  return {
    id: newPersonId(),
    householdId: input.householdId,
    displayName: requireText(input.displayName, 'displayName'),
    role: requireText(input.role, 'role'),
    birthDate: input.birthDate?.trim() || null,
    locale: requireText(input.locale, 'locale'),
    timezone: requireText(input.timezone, 'timezone'),
    permissionsProfileId: input.permissionsProfileId?.trim() || null,
    status: 'active',
    createdAt: now,
    updatedAt: new Date(now),
  };
}
