import { describe, expect, it } from 'vitest';
import { evaluateFreshness } from '../../src/live/freshness.js';

const now = new Date('2026-09-01T15:00:00Z');

describe('live fact freshness', () => {
  it('marks a recently observed live fact fresh', () => {
    expect(
      evaluateFreshness(
        new Date('2026-09-01T14:55:00Z'),
        new Date('2026-09-01T15:20:00Z'),
        now,
      ),
    ).toBe('FRESH');
  });

  it('marks a valid but aging live fact stale', () => {
    expect(
      evaluateFreshness(
        new Date('2026-09-01T14:00:00Z'),
        new Date('2026-09-01T15:15:00Z'),
        now,
      ),
    ).toBe('STALE');
  });

  it('marks a fact expired once expiresAt is not in the future', () => {
    expect(evaluateFreshness(new Date('2026-09-01T14:30:00Z'), now, now)).toBe('EXPIRED');
  });

  it('returns unknown when observation or expiry is missing', () => {
    expect(evaluateFreshness(null, null, now)).toBe('UNKNOWN');
  });
});
