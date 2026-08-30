import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import type { HouseholdId, PersonId } from '../../src/kernel/ids.js';
import { normalizeHealthMeasurement } from '../../src/health/health-normalizer.js';

const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));
const context = {
  householdId: 'household-1' as HouseholdId,
  personId: 'person-1' as PersonId,
  provider: 'health_connect' as const,
  sourceDeviceId: 'pixel-1',
  clock,
  config: {
    measurementFreshnessMs: 24 * 60 * 60 * 1000,
    heartbeatFreshnessMs: 6 * 60 * 60 * 1000,
    degradedGraceMs: 48 * 60 * 60 * 1000,
    maxFutureSkewMs: 5 * 60 * 1000,
    maxImportAgeMs: 30 * 24 * 60 * 60 * 1000,
  },
};

function input(
  kind: 'steps' | 'heart_rate' | 'sleep' | 'weight' | 'active_energy',
  value: number,
  unit: 'count' | 'bpm' | 'minutes' | 'kg' | 'kcal',
  externalId: string,
) {
  return {
    kind,
    value,
    unit,
    measuredAt: '2026-08-30T10:00:00Z',
    externalId,
  } as const;
}

describe('normalizeHealthMeasurement', () => {
  it('normalizes steps into the canonical contract', () => {
    const result = normalizeHealthMeasurement(
      input('steps', 8432, 'count', 'hc-steps-42'),
      context,
    );

    expect(result.kind).toBe('steps');
    expect(result.unit).toBe('count');
    expect(result.sourceProvider).toBe('health_connect');
    expect(result.sourceDeviceId).toBe('pixel-1');
    expect(result.householdId).toBe('household-1');
    expect(result.personId).toBe('person-1');
    expect(result.dedupeKey).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receivedAt.toISOString()).toBe('2026-08-30T12:00:00.000Z');
  });

  it.each([
    ['heart_rate', 72, 'bpm'],
    ['sleep', 480, 'minutes'],
    ['weight', 80.5, 'kg'],
    ['active_energy', 630, 'kcal'],
  ] as const)('accepts valid %s measurements', (kind, value, unit) => {
    const result = normalizeHealthMeasurement(input(kind, value, unit, `${kind}-1`), context);
    expect(result).toMatchObject({ kind, value, unit });
  });

  it('rejects an invalid unit for heart rate', () => {
    expect(() =>
      normalizeHealthMeasurement(input('heart_rate', 72, 'kg', 'hr-1'), context),
    ).toThrow('heart_rate requires bpm');
  });

  it.each([
    ['steps', -1, 'count'],
    ['steps', 1.5, 'count'],
    ['heart_rate', 251, 'bpm'],
    ['sleep', 1441, 'minutes'],
    ['weight', 0, 'kg'],
    ['active_energy', 20001, 'kcal'],
  ] as const)('rejects invalid %s values', (kind, value, unit) => {
    expect(() =>
      normalizeHealthMeasurement(input(kind, value, unit, `${kind}-bad`), context),
    ).toThrow();
  });

  it('rejects measurements too far in the future', () => {
    expect(() =>
      normalizeHealthMeasurement(
        {
          ...input('steps', 10, 'count', 'future-1'),
          measuredAt: '2026-08-30T12:06:00Z',
        },
        context,
      ),
    ).toThrow('measurement timestamp is too far in the future');
  });

  it('rejects measurements older than the import window', () => {
    expect(() =>
      normalizeHealthMeasurement(
        {
          ...input('weight', 80, 'kg', 'old-1'),
          measuredAt: '2026-07-30T11:59:59Z',
        },
        context,
      ),
    ).toThrow('measurement timestamp is too old');
  });

  it('uses provider, device and external id for deterministic deduplication', () => {
    const first = normalizeHealthMeasurement(input('steps', 100, 'count', 'same-id'), context);
    const second = normalizeHealthMeasurement(input('steps', 200, 'count', 'same-id'), context);

    expect(first.dedupeKey).toBe(second.dedupeKey);
  });

  it('uses canonical fields for deterministic deduplication when external id is absent', () => {
    const raw = {
      kind: 'weight' as const,
      value: 80.5,
      unit: 'kg' as const,
      measuredAt: '2026-08-30T10:00:00Z',
    };

    const first = normalizeHealthMeasurement(raw, context);
    const second = normalizeHealthMeasurement(raw, context);

    expect(first.dedupeKey).toBe(second.dedupeKey);
  });
});
