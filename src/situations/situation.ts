export type SituationType = 'LATE_DEPARTURE_RISK';

export interface SituationEntityReference {
  readonly type: string;
  readonly id: string;
}

export interface SituationSupportingFactor {
  readonly name: string;
  readonly value: number | string | boolean;
}

export interface Situation {
  readonly type: SituationType;
  readonly confidence: number;
  readonly relatedEntities: readonly SituationEntityReference[];
  readonly supportingFactors: readonly SituationSupportingFactor[];
  readonly detectedAt: Date;
  readonly expiresAt: Date;
}
