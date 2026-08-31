import { describe, expect, it } from 'vitest';

const householdId = '00000000-0000-4000-8000-000000000001';
const personId = '00000000-0000-4000-8000-000000000002';

async function loadModule(path: string): Promise<Record<string, unknown> | null> {
  return import(path).catch(() => null) as Promise<Record<string, unknown> | null>;
}

describe('KidsWorld domain', () => {
  it('creates a profile with zero progression', async () => {
    const module = await loadModule('../../src/kidsworld/kidsworld-profile.js');
    expect(module, 'kidsworld-profile module should exist').not.toBeNull();
    expect(typeof module?.createKidsWorldProfile).toBe('function');

    const createKidsWorldProfile = module?.createKidsWorldProfile as (input: {
      householdId: string;
      personId: string;
      avatarKey: string;
    }) => Record<string, unknown>;

    const profile = createKidsWorldProfile({ householdId, personId, avatarKey: 'blue' });
    expect(profile).toMatchObject({
      householdId,
      personId,
      avatarKey: 'blue',
      companionKey: 'agnes-dino',
      themeKey: 'kidsworld-default',
      xp: 0,
      starsBalance: 0,
      status: 'active',
    });
  });

  it('completes an available mission once', async () => {
    const module = await loadModule('../../src/kidsworld/mission.js');
    expect(module, 'mission module should exist').not.toBeNull();
    expect(typeof module?.createMission).toBe('function');
    expect(typeof module?.completeMissionRecord).toBe('function');

    const createMission = module?.createMission as (
      input: Record<string, unknown>,
    ) => Record<string, unknown>;
    const completeMissionRecord = module?.completeMissionRecord as (
      mission: Record<string, unknown>,
      completedAt: Date,
    ) => Record<string, unknown>;

    const mission = createMission({
      householdId,
      personId,
      type: 'learning',
      title: '5 λεπτά ανάγνωση',
      scheduledFor: new Date('2026-09-01T14:00:00Z'),
      rewardStars: 10,
      source: 'system',
    });

    const completed = completeMissionRecord(mission, new Date('2026-09-01T14:05:00Z'));
    expect(completed).toMatchObject({ status: 'completed' });
    expect(completed.completedAt).toEqual(new Date('2026-09-01T14:05:00Z'));
    expect(() => completeMissionRecord(completed, new Date('2026-09-01T14:06:00Z'))).toThrow(
      /already completed/i,
    );
  });

  it('rejects a zero-value star ledger entry', async () => {
    const module = await loadModule('../../src/kidsworld/star-ledger.js');
    expect(module, 'star-ledger module should exist').not.toBeNull();
    expect(typeof module?.createStarLedgerEntry).toBe('function');

    const createStarLedgerEntry = module?.createStarLedgerEntry as (
      input: Record<string, unknown>,
    ) => unknown;

    expect(() =>
      createStarLedgerEntry({
        householdId,
        personId,
        amount: 0,
        reason: 'test',
        correlationId: 'test:zero',
      }),
    ).toThrow(/amount/i);
  });
});
