export interface ExternalCalendarRecord {
  readonly provider: string;
  readonly externalId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
  readonly version?: string;
  readonly etag?: string;
  readonly syncToken?: string;
}

export interface ExternalReference {
  readonly provider: string;
  readonly externalId: string;
  readonly externalVersion: string | null;
  readonly etag: string | null;
  readonly syncToken: string | null;
  readonly lastSyncedAt: Date;
  readonly authoritative: boolean;
}
