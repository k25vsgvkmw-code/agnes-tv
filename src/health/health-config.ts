export interface HealthConfig {
  readonly measurementFreshnessMs: number;
  readonly heartbeatFreshnessMs: number;
  readonly degradedGraceMs: number;
  readonly maxFutureSkewMs: number;
  readonly maxImportAgeMs: number;
}

export const defaultHealthConfig: HealthConfig = {
  measurementFreshnessMs: 24 * 60 * 60 * 1000,
  heartbeatFreshnessMs: 6 * 60 * 60 * 1000,
  degradedGraceMs: 48 * 60 * 60 * 1000,
  maxFutureSkewMs: 5 * 60 * 1000,
  maxImportAgeMs: 30 * 24 * 60 * 60 * 1000,
};
