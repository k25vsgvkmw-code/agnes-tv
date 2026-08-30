import { randomUUID } from 'node:crypto';

type BrandedId<TName extends string> = string & { readonly __brand: TName };

export type EventId = BrandedId<'EventId'>;
export type HouseholdId = BrandedId<'HouseholdId'>;
export type PersonId = BrandedId<'PersonId'>;
export type CalendarEventId = BrandedId<'CalendarEventId'>;
export type ExternalReferenceId = BrandedId<'ExternalReferenceId'>;
export type DeviceId = BrandedId<'DeviceId'>;
export type SituationId = BrandedId<'SituationId'>;
export type CommandId = BrandedId<'CommandId'>;

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

export function newDeviceId(): DeviceId {
  return randomUUID() as DeviceId;
}

export function newSituationId(): SituationId {
  return randomUUID() as SituationId;
}

export function newCommandId(): CommandId {
  return randomUUID() as CommandId;
}
