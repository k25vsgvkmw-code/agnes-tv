import { describe, expect, it } from 'vitest';
import { resolvePresence } from '../../src/presence/presence-resolver.js';
import type {
  PresenceEvidence,
  PresenceEvidenceSource,
  PresenceStateName,
} from '../../src/presence/presence-state.js';

const now = new Date('2026-09-01T15:00:00Z');

function evidence(
  source: PresenceEvidenceSource,
  state: PresenceStateName,
  overrides: Partial<PresenceEvidence> = {},
): PresenceEvidence {
  return {
    source,
    state,
    observedAt: new Date('2026-09-01T14:59:00Z'),
    expiresAt: new Date('2026-09-01T15:10:00Z'),
    confidence: 1,
    ...overrides,
  };
}

describe('presence resolver', () => {
  it('resolves a fresh HOME location signal as PRESENT', () => {
    const result = resolvePresence([evidence('LOCATION', 'PRESENT')], now);

    expect(result).toMatchObject({
      state: 'PRESENT',
      confidence: 0.9,
      sources: ['LOCATION'],
    });
    expect(result.expiresAt?.toISOString()).toBe('2026-09-01T15:10:00.000Z');
  });

  it('ignores expired location evidence and returns UNKNOWN', () => {
    const result = resolvePresence(
      [
        evidence('LOCATION', 'PRESENT', {
          expiresAt: new Date('2026-09-01T14:59:59Z'),
        }),
      ],
      now,
    );

    expect(result).toMatchObject({ state: 'UNKNOWN', confidence: 0, sources: [] });
    expect(result.expiresAt).toBeUndefined();
  });

  it('does not treat calendar evidence alone as proof of presence', () => {
    const result = resolvePresence([evidence('CALENDAR', 'AWAY')], now);

    expect(result).toMatchObject({ state: 'UNKNOWN', confidence: 0, sources: ['CALENDAR'] });
  });

  it('returns UNKNOWN when opposing top scores differ by no more than 0.15', () => {
    const result = resolvePresence(
      [evidence('LOCATION', 'PRESENT'), evidence('HOME_WIFI', 'AWAY')],
      now,
    );

    expect(result).toMatchObject({
      state: 'UNKNOWN',
      confidence: 0,
      sources: ['LOCATION', 'HOME_WIFI'],
    });
  });

  it('lets a fresh manual state override stronger automatic evidence', () => {
    const result = resolvePresence(
      [
        evidence('LOCATION', 'PRESENT'),
        evidence('MANUAL', 'AWAY', { confidence: 0.6 }),
      ],
      now,
    );

    expect(result).toMatchObject({ state: 'AWAY', confidence: 0.6, sources: ['MANUAL'] });
  });

  it('preserves winning contributing sources and their earliest expiry', () => {
    const result = resolvePresence(
      [
        evidence('HOME_WIFI', 'PRESENT', {
          expiresAt: new Date('2026-09-01T15:04:00Z'),
        }),
        evidence('NEARBY', 'PRESENT', {
          expiresAt: new Date('2026-09-01T15:06:00Z'),
        }),
        evidence('INTERACTION', 'PRESENT', {
          expiresAt: new Date('2026-09-01T15:03:00Z'),
        }),
      ],
      now,
    );

    expect(result.state).toBe('PRESENT');
    expect(result.sources).toEqual(['HOME_WIFI', 'NEARBY', 'INTERACTION']);
    expect(result.expiresAt?.toISOString()).toBe('2026-09-01T15:03:00.000Z');
  });

  it('normalizes evidence confidence to the zero-to-one range', () => {
    const high = resolvePresence(
      [evidence('LOCATION', 'PRESENT', { confidence: 2 })],
      now,
    );
    const low = resolvePresence(
      [evidence('LOCATION', 'PRESENT', { confidence: -1 })],
      now,
    );

    expect(high.confidence).toBe(0.9);
    expect(low.confidence).toBe(0);
  });
});
