import { ValidationError } from '../kernel/errors.js';
import { newPersonId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export type PersonStatus = 'active' | 'inactive';

export interface Person {
  readonly id: PersonId;
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: string;
  readonly locale: string;
  readonly timezone: string;
  readonly status: PersonStatus;
}

export interface CreatePersonInput {
  readonly id?: PersonId;
  readonly householdId: HouseholdId;
  readonly displayName: string;
  readonly role: string;
  readonly locale: string;
  readonly timezone: string;
}

export function createPerson(input: CreatePersonInput): Person {
  const displayName = input.displayName.trim();
  const role = input.role.trim();
  const locale = input.locale.trim();
  const timezone = input.timezone.trim();

  if (!displayName) throw new ValidationError('person display name is required');
  if (!role) throw new ValidationError('person role is required');
  if (!locale) throw new ValidationError('person locale is required');
  if (!timezone) throw new ValidationError('person timezone is required');

  return {
    id: input.id ?? newPersonId(),
    householdId: input.householdId,
    displayName,
    role,
    locale,
    timezone,
    status: 'active',
  };
}
