export interface ExternalCalendarRecord {
  readonly provider: string;
  readonly externalId: string;
  readonly title: string;
  readonly description?: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
  readonly version?: string;
  readonly etag?: string;
  readonly syncToken?: string;
}
