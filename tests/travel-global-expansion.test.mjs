import { describe, expect, it } from 'vitest';
import { GLOBAL_EXPANSION_JOURNEYS } from '../docs/travel/journeys-global-expansion.js';
import { DEPARTURE_PORTS } from '../docs/travel/journeys-data.js';

const modes = new Set(GLOBAL_EXPANSION_JOURNEYS.map((journey) => journey.mode));
const regions = new Set(GLOBAL_EXPANSION_JOURNEYS.map((journey) => journey.region));

describe('global journey expansion', () => {
  it('adds substantial world coverage across every travel mode', () => {
    expect(GLOBAL_EXPANSION_JOURNEYS.length).toBeGreaterThanOrEqual(25);
    expect([...modes].sort()).toEqual(['air', 'rail', 'road', 'sea']);
    for (const region of [
      'Europe',
      'Asia',
      'Africa',
      'North America',
      'South America',
      'Oceania',
    ]) {
      expect(regions.has(region), `missing region: ${region}`).toBe(true);
    }
  });

  it('uses unique ids and usable routes', () => {
    const ids = GLOBAL_EXPANSION_JOURNEYS.map((journey) => journey.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const journey of GLOBAL_EXPANSION_JOURNEYS) {
      expect(journey.title).toBeTruthy();
      expect(journey.subtitle).toBeTruthy();
      expect(journey.route.stops.length).toBeGreaterThanOrEqual(3);
      expect(journey.bestMonths.length > 0 || journey.yearRound).toBe(true);
    }
  });

  it('maps cruise departures to supported ports', () => {
    const portIds = new Set(DEPARTURE_PORTS.map((port) => port.id));
    const cruises = GLOBAL_EXPANSION_JOURNEYS.filter((journey) => journey.type === 'cruise');
    expect(cruises.length).toBeGreaterThanOrEqual(6);
    for (const item of cruises) {
      expect(portIds.has(item.cruise.departurePort)).toBe(true);
      expect(item.departurePorts).toContain(item.cruise.departurePort);
      expect(item.cruise.portsOfCall.length).toBeGreaterThanOrEqual(3);
    }
  });
});
