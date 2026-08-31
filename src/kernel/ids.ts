import { randomUUID } from 'node:crypto';

type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type EventId = Brand<string, 'EventId'>;
export type HouseholdId = Brand<string, 'HouseholdId'>;
export type PersonId = Brand<string, 'PersonId'>;

export function newEventId(): EventId {
  return randomUUID() as EventId;
}

export function newHouseholdId(): HouseholdId {
  return randomUUID() as HouseholdId;
}

export function newPersonId(): PersonId {
  return randomUUID() as PersonId;
}
