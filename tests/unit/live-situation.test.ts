import { describe, expect, it } from 'vitest';
import { newHouseholdId, newSituationId } from '../../src/kernel/ids.js';
import { InMemoryActiveSituationStore } from '../../src/situations/in-memory-active-situation-store.js';
import type { LiveSituation } from '../../src/situations/live-situation.js';
import { createSituationFingerprint } from '../../src/situations/situation-fingerprint.js';

function situation(
  overrides: Partial<LiveSituation> & Pick<LiveSituation, 'householdId' | 'fingerprint'>,
): LiveSituation {
  const detectedAt = new Date('2026-09-01T15:00:00Z');
  return {
    id: newSituationId(),
    householdId: overrides.householdId,
    fingerprint: overrides.fingerprint,
    type: 'DEPARTURE_PREPARATION',
    state: 'DETECTED',
    confidence: 0.9,
    relatedEntities: [{ type: 'calendar_event', id: 'event-1' }],
    supportingFactors: [{ name: 'rain_probability', value: 0.8 }],
    detectedAt,
    updatedAt: detectedAt,
    expiresAt: new Date('2026-09-01T15:30:00Z'),
    ...overrides,
  };
}

describe('Live v2 situation lifecycle and deduplication', () => {
  it('creates the same fingerprint regardless of related-entity ordering', () => {
    const householdId = newHouseholdId();
    const base = {
      householdId,
      type: 'DEPARTURE_PREPARATION' as const,
      timeWindow: {
        startsAt: new Date('2026-09-01T15:00:00.000Z'),
        endsAt: new Date('2026-09-01T15:30:00.000Z'),
      },
    };

    const first = createSituationFingerprint({
      ...base,
      relatedEntities: [
        { type: 'person', id: 'person-2' },
        { type: 'calendar_event', id: 'event-1' },
      ],
    });
    const second = createSituationFingerprint({
      ...base,
      relatedEntities: [
        { type: 'calendar_event', id: 'event-1' },
        { type: 'person', id: 'person-2' },
      ],
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('activates a new situation and updates the same logical entry on repeated fingerprint', async () => {
    const householdId = newHouseholdId();
    const fingerprint = 'same-fingerprint';
    const store = new InMemoryActiveSituationStore();
    const first = situation({ householdId, fingerprint });

    const activated = await store.upsert(first);
    expect(activated.state).toBe('ACTIVE');

    const later = situation({
      householdId,
      fingerprint,
      id: newSituationId(),
      confidence: 0.97,
      updatedAt: new Date('2026-09-01T15:05:00Z'),
      expiresAt: new Date('2026-09-01T15:35:00Z'),
    });
    const updated = await store.upsert(later);

    expect(updated.state).toBe('UPDATED');
    expect(updated.id).toBe(first.id);
    expect(updated.confidence).toBe(0.97);
    expect(await store.getByFingerprint(fingerprint)).toEqual(updated);
  });

  it('expires active entries at or before the cutoff and removes them from active lookup', async () => {
    const householdId = newHouseholdId();
    const store = new InMemoryActiveSituationStore();
    const early = situation({ householdId, fingerprint: 'b', expiresAt: new Date('2026-09-01T15:10:00Z') });
    const sameTime = situation({
      householdId,
      fingerprint: 'a',
      expiresAt: new Date('2026-09-01T15:15:00Z'),
    });
    const later = situation({
      householdId,
      fingerprint: 'c',
      expiresAt: new Date('2026-09-01T15:20:00Z'),
    });
    await store.upsert(early);
    await store.upsert(sameTime);
    await store.upsert(later);

    const expired = await store.expireBefore(new Date('2026-09-01T15:15:00Z'));

    expect(expired.map((entry) => [entry.fingerprint, entry.state])).toEqual([
      ['a', 'EXPIRED'],
      ['b', 'EXPIRED'],
    ]);
    expect(await store.getByFingerprint('a')).toBeUndefined();
    expect(await store.getByFingerprint('b')).toBeUndefined();
    expect(await store.getByFingerprint('c')).toBeDefined();
  });

  it('resolves and removes an active situation deterministically', async () => {
    const householdId = newHouseholdId();
    const store = new InMemoryActiveSituationStore();
    await store.upsert(situation({ householdId, fingerprint: 'resolved-one' }));

    const resolvedAt = new Date('2026-09-01T15:08:00Z');
    const resolved = await store.resolve('resolved-one', resolvedAt);

    expect(resolved?.state).toBe('RESOLVED');
    expect(resolved?.updatedAt).toEqual(resolvedAt);
    expect(await store.getByFingerprint('resolved-one')).toBeUndefined();
  });
});
