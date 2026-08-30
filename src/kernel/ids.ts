import { randomUUID } from 'node:crypto';

type BrandedId<TName extends string> = string & { readonly __brand: TName };

export type EventId = BrandedId<'EventId'>;
export type HouseholdId = BrandedId<'HouseholdId'>;
export type PersonId = BrandedId<'PersonId'>;

export function newEventId(): EventId {
  return randomUUID() as EventId;
}

export function newHouseholdId(): HouseholdId {
  return randomUUID() as HouseholdId;
}

export function newPersonId(): PersonId {
  return randomUUID() as PersonId;
}
