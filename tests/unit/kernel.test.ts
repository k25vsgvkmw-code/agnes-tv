import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { newEventId } from '../../src/kernel/ids.js';

describe('kernel primitives', () => {
  it('provides deterministic time in tests', () => {
    const clock = new FixedClock(new Date('2026-08-30T10:00:00Z'));
    expect(clock.now().toISOString()).toBe('2026-08-30T10:00:00.000Z');
  });

  it('creates non-empty event ids', () => {
    expect(newEventId()).toMatch(/[0-9a-f-]{36}/);
  });
});
