export type PresenceStateName = 'PRESENT' | 'AWAY' | 'ARRIVING' | 'LEAVING' | 'UNKNOWN';

export type PresenceEvidenceSource =
  'MANUAL' | 'LOCATION' | 'HOME_WIFI' | 'NEARBY' | 'INTERACTION' | 'CALENDAR';

export interface PresenceEvidence {
  readonly source: PresenceEvidenceSource;
  readonly state: PresenceStateName;
  readonly observedAt: Date;
  readonly expiresAt: Date;
  readonly confidence: number;
}

export interface PresenceState {
  readonly state: PresenceStateName;
  readonly confidence: number;
  readonly sources: readonly PresenceEvidenceSource[];
  readonly expiresAt?: Date;
}
