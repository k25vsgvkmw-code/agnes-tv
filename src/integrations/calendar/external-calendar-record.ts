export interface ExternalReference {
  readonly provider: string;
  readonly externalId: string;
  readonly externalVersion?: string;
  readonly etag?: string;
  readonly syncToken?: string;
  readonly lastSyncedAt: Date;
  readonly authoritative: boolean;
}

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

export interface NormalizedCalendarRecord {
  readonly title: string;
  readonly description?: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly externalReference: ExternalReference;
}
