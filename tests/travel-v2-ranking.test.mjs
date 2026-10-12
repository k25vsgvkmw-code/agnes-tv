import { describe, expect, it } from 'vitest';
import {
  RANKING_WEIGHTS,
  classifySeason,
  rankJourneys,
  scoreJourney,
} from '../docs/travel/ranking-v2.js';

const base = {
  id: 'base',
  mode: 'road',
  type: 'road-trip',
  bestMonths: [10],
  shoulderMonths: [9, 11],
  feelings: ['wild'],
  styles: ['scenic'],
  editorialPriority: 10,
  originIds: ['road-athens'],
  duration: { minDays: 6, maxDays: 8, label: '7 days' },
};

describe('AGNES World V2 ranking', () => {
  it('lets explicit constraints dominate editorial priority', () => {
    const matching = { ...base, id: 'matching' };
    const editorial = { ...base, id: 'editorial', mode: 'air', editorialPriority: 100 };
    const ranked = rankJourneys([editorial, matching], {
      month: 10,
      mode: 'road',
      originId: 'road-athens',
      durationDays: 7,
      feelings: ['wild'],
      styles: ['scenic'],
    });

    expect(ranked[0].id).toBe('matching');
    expect(RANKING_WEIGHTS.mode).toBeGreaterThan(RANKING_WEIGHTS.editorialPriority);
  });

  it('weights cruise departure port and rail origin station relevance', () => {
    const cruiseA = {
      ...base,
      id: 'cruise-a',
      mode: 'sea',
      type: 'cruise',
      originIds: ['port-limassol'],
    };
    const cruiseB = {
      ...cruiseA,
      id: 'cruise-b',
      originIds: ['port-piraeus'],
      editorialPriority: 99,
    };
    const cruiseRanked = rankJourneys([cruiseB, cruiseA], {
      mode: 'sea',
      originId: 'port-limassol',
      month: 10,
    });
    expect(cruiseRanked[0].id).toBe('cruise-a');

    const railA = {
      ...base,
      id: 'rail-a',
      mode: 'rail',
      type: 'rail-journey',
      originIds: ['station-tokyo'],
    };
    const railB = {
      ...railA,
      id: 'rail-b',
      originIds: ['station-zurich'],
      editorialPriority: 99,
    };
    const railRanked = rankJourneys([railB, railA], {
      mode: 'rail',
      originId: 'station-tokyo',
      month: 10,
    });
    expect(railRanked[0].id).toBe('rail-a');
  });

  it('does not invent location relevance when origin is absent', () => {
    const near = { ...base, id: 'near', originIds: ['road-athens'] };
    const far = { ...base, id: 'far', originIds: ['road-reykjavik'] };

    expect(scoreJourney(near, { month: 10 })).toBe(scoreJourney(far, { month: 10 }));
  });

  it('classifies best, shoulder and flexible seasons deterministically', () => {
    expect(classifySeason(base, 10)).toBe('best');
    expect(classifySeason(base, 9)).toBe('shoulder');
    expect(classifySeason({ ...base, yearRound: true }, 2)).toBe('year-round');
  });
});
