import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  createCatalog,
  getDestination,
  getJourney,
  getJourneysByMode,
  getOrigin,
} from '../docs/travel/catalog.js';

describe('AGNES World V2 catalog', () => {
  it('contains all four first-class travel modes and preserves core journeys', () => {
    expect(new Set(CATALOG.journeys.map((journey) => journey.mode))).toEqual(
      new Set(['air', 'sea', 'rail', 'road']),
    );
    expect(getJourney('zagori-metsovo-meteora')?.title).toMatch(/Zagori/);
    expect(getJourney('japan-rail-escape')?.mode).toBe('rail');
    expect(getJourneysByMode('sea').some((journey) => journey.type === 'cruise')).toBe(true);
  });

  it('resolves normalized destination and origin references', () => {
    expect(getDestination('gr-santorini')?.countryName).toBe('Greece');
    expect(getOrigin('port-limassol')?.type).toBe('port');
    expect(getOrigin('station-tokyo')?.type).toBe('station');
  });

  it('rejects duplicate ids and dangling journey references', () => {
    expect(() =>
      createCatalog({
        destinations: [
          { id: 'dup', name: 'One' },
          { id: 'dup', name: 'Two' },
        ],
        origins: [],
        journeys: [],
        operators: [],
      }),
    ).toThrow(/duplicate/i);

    expect(() =>
      createCatalog({
        destinations: [],
        origins: [],
        journeys: [
          {
            id: 'broken',
            mode: 'road',
            destinationIds: ['missing-destination'],
            originIds: [],
          },
        ],
        operators: [],
      }),
    ).toThrow(/missing-destination/i);
  });
});
