import { describe, expect, it } from 'vitest';
import {
  JOURNEYS,
  DEPARTURE_PORTS,
  getJourneyById,
  filterJourneys,
} from '../docs/travel/journeys-data.js';

describe('AGNES World journey catalog', () => {
  it('covers all four travel modes with unique ids and three signature moments', () => {
    expect(new Set(JOURNEYS.map((journey) => journey.id)).size).toBe(JOURNEYS.length);
    expect(new Set(JOURNEYS.map((journey) => journey.mode))).toEqual(
      new Set(['air', 'sea', 'rail', 'road']),
    );
    expect(JOURNEYS.every((journey) => journey.signatureMoments.length === 3)).toBe(true);
    expect(JOURNEYS.length).toBeGreaterThanOrEqual(20);
  });

  it('contains flagship journeys and cruise departure metadata', () => {
    expect(getJourneyById('zagori-metsovo-meteora')).toBeTruthy();
    expect(getJourneyById('greek-islands-limassol')?.cruise?.departurePort).toBe('limassol');
    expect(getJourneyById('japan-rail-escape')?.mode).toBe('rail');
    expect(getJourneyById('tokyo-kyoto')?.mode).toBe('air');
    expect(getJourneyById('missing')).toBeNull();
    expect(DEPARTURE_PORTS.some((port) => port.id === 'limassol')).toBe(true);
    expect(DEPARTURE_PORTS.some((port) => port.id === 'miami')).toBe(true);
  });

  it('filters immutably by mode and departure port', () => {
    const before = JSON.stringify(JOURNEYS);
    const sea = filterJourneys(JOURNEYS, { mode: 'sea', departurePort: 'limassol' });
    expect(sea.map((journey) => journey.id)).toContain('greek-islands-limassol');
    expect(sea.every((journey) => journey.mode === 'sea')).toBe(true);
    expect(JSON.stringify(JOURNEYS)).toBe(before);
  });
});
