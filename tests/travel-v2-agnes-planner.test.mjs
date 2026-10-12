import { describe, expect, it } from 'vitest';
import { planWithAgnes } from '../docs/travel/agnes-planner-v2.js';

const catalog = [
  {
    id: 'sea-1',
    mode: 'sea',
    type: 'cruise',
    title: 'Aegean',
    region: 'Greece',
    bestMonths: [10],
    originIds: ['port-limassol'],
    feelings: ['romantic'],
    styles: ['island'],
    editorialPriority: 5,
  },
  {
    id: 'rail-1',
    mode: 'rail',
    type: 'rail-journey',
    title: 'Alpine Rail',
    region: 'Europe',
    bestMonths: [10],
    originIds: ['station-zurich'],
    feelings: ['slow'],
    styles: ['scenic'],
    editorialPriority: 5,
  },
  {
    id: 'road-1',
    mode: 'road',
    type: 'road-trip',
    title: 'Dolomites',
    region: 'Europe',
    bestMonths: [10],
    originIds: ['road-venice'],
    feelings: ['wild'],
    styles: ['scenic'],
    editorialPriority: 5,
  },
];

describe('AGNES Planner V2', () => {
  it('extracts duration, month and mode deterministically', () => {
    const result = planWithAgnes('7 days in October by sea', {
      catalog,
      state: { month: 1 },
    });
    expect(result.statePatch).toMatchObject({ durationDays: 7, month: 10, mode: 'sea' });
  });

  it('understands origin and rail intent', () => {
    expect(planWithAgnes('from Limassol', { catalog, state: {} }).statePatch.originId).toBe(
      'port-limassol',
    );
    expect(planWithAgnes('mountains by train', { catalog, state: {} }).statePatch.mode).toBe(
      'rail',
    );
  });

  it('handles less driving without unsafe claims', () => {
    const result = planWithAgnes('less driving', { catalog, state: { mode: 'road' } });
    expect(result.statePatch.drivingPace).toBe('easy');
    expect(result.reply).toContain('driving');
  });

  it('returns a safe no-claim response for unknown requests', () => {
    const result = planWithAgnes('guarantee me the cheapest flight tomorrow', {
      catalog,
      state: {},
    });
    expect(result.nextAction).toBe('clarify');
    expect(result.reply.toLowerCase()).not.toContain('guarantee');
  });
});
