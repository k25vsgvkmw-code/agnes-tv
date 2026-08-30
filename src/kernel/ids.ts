import { randomUUID } from 'node:crypto';

type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type EventId = Brand<string, 'EventId'>;
export type HouseholdId = Brand<string, 'HouseholdId'>;
export type PersonId = Brand<string, 'PersonId'>;
export type CalendarEventId = Brand<string, 'CalendarEventId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type AuditRecordId = Brand<string, 'AuditRecordId'>;

const newId = <T extends string>(): T => randomUUID() as T;

export const newEventId = (): EventId => newId<EventId>();
export const newHouseholdId = (): HouseholdId => newId<HouseholdId>();
export const newPersonId = (): PersonId => newId<PersonId>();
export const newCalendarEventId = (): CalendarEventId => newId<CalendarEventId>();
export const newNotificationId = (): NotificationId => newId<NotificationId>();
export const newAuditRecordId = (): AuditRecordId => newId<AuditRecordId>();
