import { randomUUID } from 'node:crypto';

type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type EventId = Brand<string, 'EventId'>;
export type HouseholdId = Brand<string, 'HouseholdId'>;
export type PersonId = Brand<string, 'PersonId'>;
export type CalendarEventId = Brand<string, 'CalendarEventId'>;
export type ExternalReferenceId = Brand<string, 'ExternalReferenceId'>;
export type KidsWorldMissionId = Brand<string, 'KidsWorldMissionId'>;
export type StarLedgerEntryId = Brand<string, 'StarLedgerEntryId'>;

export function newEventId(): EventId {
  return randomUUID() as EventId;
}

export function newHouseholdId(): HouseholdId {
  return randomUUID() as HouseholdId;
}

export function newPersonId(): PersonId {
  return randomUUID() as PersonId;
}

export function newCalendarEventId(): CalendarEventId {
  return randomUUID() as CalendarEventId;
}

export function newExternalReferenceId(): ExternalReferenceId {
  return randomUUID() as ExternalReferenceId;
}

export function newKidsWorldMissionId(): KidsWorldMissionId {
  return randomUUID() as KidsWorldMissionId;
}

export function newStarLedgerEntryId(): StarLedgerEntryId {
  return randomUUID() as StarLedgerEntryId;
}
