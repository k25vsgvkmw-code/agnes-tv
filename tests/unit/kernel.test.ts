import { describe, expect, it } from 'vitest';
import { FixedClock, SystemClock } from '../../src/kernel/clock.js';
import { AgnesError, ValidationError } from '../../src/kernel/errors.js';
import {
  newCommandId,
  newDeviceId,
  newEventId,
  newHouseholdId,
  newSituationId,
} from '../../src/kernel/ids.js';
import { err, ok } from '../../src/kernel/result.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('kernel primitives', () => {
  it('provides deterministic time in tests without exposing the original Date instance', () => {
    const source = new Date('2026-08-30T10:00:00Z');
    const clock = new FixedClock(source);

    source.setUTCFullYear(2030);
    const first = clock.now();
    first.setUTCFullYear(2040);

    expect(clock.now().toISOString()).toBe('2026-08-30T10:00:00.000Z');
  });

  it('provides current time from the system clock', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it('creates UUID-backed core and Live v2 ids', () => {
    expect(newEventId()).toMatch(UUID_PATTERN);
    expect(newHouseholdId()).toMatch(UUID_PATTERN);
    expect(newDeviceId()).toMatch(UUID_PATTERN);
    expect(newSituationId()).toMatch(UUID_PATTERN);
    expect(newCommandId()).toMatch(UUID_PATTERN);
  });

  it('represents successful and failed results without throwing', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });

    const validationError = new ValidationError('timezone is required', { field: 'timezone' });
    const failure = err(validationError);

    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error).toBe(validationError);
    }
  });

  it('exposes structured application errors with stable codes and details', () => {
    const error = new ValidationError('timezone is required', { field: 'timezone' });

    expect(error).toBeInstanceOf(AgnesError);
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('timezone is required');
    expect(error.details).toEqual({ field: 'timezone' });
  });
});
