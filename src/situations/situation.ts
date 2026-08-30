export type SituationType = 'LATE_DEPARTURE_RISK';

export interface SituationRelatedEntity {
  readonly type: string;
  readonly id: string;
}

export interface Situation<
  TFactors extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> {
  readonly type: SituationType;
  readonly confidence: number;
  readonly detectedAt: Date;
  readonly expiresAt: Date;
  readonly relatedEntities: readonly SituationRelatedEntity[];
  readonly supportingFactors: TFactors;
}
