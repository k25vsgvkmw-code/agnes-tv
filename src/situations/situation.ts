export interface Situation {
  readonly id: string;
  readonly type: string;
  readonly confidence: number;
  readonly relatedEntities: readonly string[];
  readonly supportingFactors: Readonly<Record<string, string | number | boolean>>;
  readonly detectedAt: Date;
  readonly expiresAt: Date;
}
