import { describe, expect, it } from 'vitest';

const householdId = '00000000-0000-4000-8000-000000000001';
const personId = '00000000-0000-4000-8000-000000000002';

async function loadModule(path: string): Promise<Record<string, unknown> | null> {
  return import(path).catch(() => null) as Promise<Record<string, unknown> | null>;
}

describe('KidsWorld progression domain', () => {
  it('requires a positive learning duration and copies completion time', async () => {
    const module = await loadModule('../../src/kidsworld/learning.js');
    expect(module, 'learning module should exist').not.toBeNull();
    expect(typeof module?.createLearningSession).toBe('function');

    const createLearningSession = module?.createLearningSession as (
      input: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(() =>
      createLearningSession({
        id: '00000000-0000-4000-8000-000000000010',
        householdId,
        personId,
        subject: 'english',
        durationMinutes: 0,
        completedAt: new Date('2026-09-01T15:00:00Z'),
        correlationId: 'learning:english:1',
      }),
    ).toThrow(/duration/i);

    const completedAt = new Date('2026-09-01T15:00:00Z');
    const session = createLearningSession({
      id: '00000000-0000-4000-8000-000000000010',
      householdId,
      personId,
      subject: 'english',
      durationMinutes: 10,
      completedAt,
      correlationId: 'learning:english:1',
    });
    expect(session).toMatchObject({ subject: 'english', durationMinutes: 10 });
    expect(session.completedAt).toEqual(completedAt);
    expect(session.completedAt).not.toBe(completedAt);
  });

  it('requires an ISO local date for routine progress', async () => {
    const module = await loadModule('../../src/kidsworld/routine.js');
    expect(module, 'routine module should exist').not.toBeNull();
    expect(typeof module?.createRoutineStepCompletion).toBe('function');

    const createRoutineStepCompletion = module?.createRoutineStepCompletion as (
      input: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(() =>
      createRoutineStepCompletion({
        householdId,
        personId,
        localDate: '01-09-2026',
        routine: 'bedtime',
        stepKey: 'story',
        completedAt: new Date('2026-09-01T19:30:00Z'),
      }),
    ).toThrow(/localDate/i);

    expect(
      createRoutineStepCompletion({
        householdId,
        personId,
        localDate: '2026-09-01',
        routine: 'bedtime',
        stepKey: 'story',
        completedAt: new Date('2026-09-01T19:30:00Z'),
      }),
    ).toMatchObject({ localDate: '2026-09-01', routine: 'bedtime', stepKey: 'story' });
  });

  it('creates only positive-cost active rewards', async () => {
    const module = await loadModule('../../src/kidsworld/reward.js');
    expect(module, 'reward module should exist').not.toBeNull();
    expect(typeof module?.createReward).toBe('function');

    const createReward = module?.createReward as (
      input: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(() =>
      createReward({
        householdId,
        name: 'Movie Night',
        description: 'Οικογενειακή ταινία',
        costStars: 0,
        requiresParentApproval: true,
      }),
    ).toThrow(/costStars/i);

    expect(
      createReward({
        householdId,
        name: 'Movie Night',
        description: 'Οικογενειακή ταινία',
        costStars: 100,
        requiresParentApproval: true,
      }),
    ).toMatchObject({
      householdId,
      name: 'Movie Night',
      costStars: 100,
      requiresParentApproval: true,
      active: true,
    });
  });

  it('provides branded ID constructors for progression records', async () => {
    const module = await loadModule('../../src/kernel/ids.js');
    expect(typeof module?.newLearningSessionId).toBe('function');
    expect(typeof module?.newRewardId).toBe('function');
    expect(typeof module?.newRewardRequestId).toBe('function');
  });
});
