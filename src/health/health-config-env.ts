import { defaultHealthConfig, type HealthConfig } from './health-config.js';

export type Environment = Readonly<Record<string, string | undefined>>;

function parsePositiveFinite(
  env: Environment,
  name: string,
  multiplier: number,
  fallback: number,
): number {
  const raw = env[name];
  if (raw === undefined) return fallback;

  const trimmed = raw.trim();
  const numeric = Number(trimmed);
  const scaled = numeric * multiplier;

  if (trimmed.length === 0 || !Number.isFinite(numeric) || numeric <= 0 || !Number.isFinite(scaled)) {
    throw new Error(`${name} must be a positive finite number`);
  }

  return scaled;
}

export function healthConfigFromEnv(env: Environment): HealthConfig {
  return {
    measurementFreshnessMs: parsePositiveFinite(
      env,
      'HEALTH_MEASUREMENT_FRESH_HOURS',
      60 * 60 * 1000,
      defaultHealthConfig.measurementFreshnessMs,
    ),
    heartbeatFreshnessMs: parsePositiveFinite(
      env,
      'HEALTH_HEARTBEAT_FRESH_HOURS',
      60 * 60 * 1000,
      defaultHealthConfig.heartbeatFreshnessMs,
    ),
    degradedGraceMs: parsePositiveFinite(
      env,
      'HEALTH_DEGRADED_GRACE_HOURS',
      60 * 60 * 1000,
      defaultHealthConfig.degradedGraceMs,
    ),
    maxFutureSkewMs: parsePositiveFinite(
      env,
      'HEALTH_MAX_FUTURE_SKEW_MINUTES',
      60 * 1000,
      defaultHealthConfig.maxFutureSkewMs,
    ),
    maxImportAgeMs: parsePositiveFinite(
      env,
      'HEALTH_MAX_IMPORT_AGE_DAYS',
      24 * 60 * 60 * 1000,
      defaultHealthConfig.maxImportAgeMs,
    ),
  };
}
