import { describe, expect, it } from 'vitest';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import { healthConfigFromEnv } from '../../src/health/health-config-env.js';

describe('healthConfigFromEnv', () => {
  it('uses the canonical defaults when no overrides are present', () => {
    expect(healthConfigFromEnv({})).toEqual(defaultHealthConfig);
  });

  it('converts positive health environment overrides into milliseconds', () => {
    expect(
      healthConfigFromEnv({
        HEALTH_MEASUREMENT_FRESH_HOURS: '12',
        HEALTH_HEARTBEAT_FRESH_HOURS: '3.5',
        HEALTH_DEGRADED_GRACE_HOURS: '72',
        HEALTH_MAX_FUTURE_SKEW_MINUTES: '10',
        HEALTH_MAX_IMPORT_AGE_DAYS: '45',
      }),
    ).toEqual({
      measurementFreshnessMs: 12 * 60 * 60 * 1000,
      heartbeatFreshnessMs: 3.5 * 60 * 60 * 1000,
      degradedGraceMs: 72 * 60 * 60 * 1000,
      maxFutureSkewMs: 10 * 60 * 1000,
      maxImportAgeMs: 45 * 24 * 60 * 60 * 1000,
    });
  });

  it.each([
    ['HEALTH_MEASUREMENT_FRESH_HOURS', '0'],
    ['HEALTH_HEARTBEAT_FRESH_HOURS', '-1'],
    ['HEALTH_DEGRADED_GRACE_HOURS', ''],
    ['HEALTH_MAX_FUTURE_SKEW_MINUTES', 'not-a-number'],
    ['HEALTH_MAX_IMPORT_AGE_DAYS', 'Infinity'],
  ])('rejects explicitly invalid %s=%s', (name, value) => {
    expect(() => healthConfigFromEnv({ [name]: value })).toThrow(
      `${name} must be a positive finite number`,
    );
  });
});
