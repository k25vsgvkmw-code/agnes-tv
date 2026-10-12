import { describe, expect, it } from 'vitest';
import { JOURNEYS } from '../docs/travel/journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from '../docs/travel/journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from '../docs/travel/journeys-world-pack-2.js';

const catalog = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS, ...WORLD_CATALOG_PACK_2];

function journeySearchText(journey) {
  const stops = journey.route.stops.map((stop) => stop.name).join(' ');
  return `${journey.title} ${stops}`;
}

describe('AGNES World catalog depth', () => {
  it('ships a deep curated world catalog rather than a demo set', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(90);
    expect(new Set(catalog.map((journey) => journey.id)).size).toBe(catalog.length);
  });

  it('covers Greece beyond the obvious, including northern and island journeys', () => {
    const greece = catalog.filter((journey) =>
      String(journey.country).toLowerCase().includes('greece'),
    );
    const searchable = greece.map(journeySearchText).join(' ').toLowerCase();

    expect(greece.length).toBeGreaterThanOrEqual(14);
    expect(searchable).toContain('edessa');
    expect(searchable).toContain('prespes');
    expect(searchable).toContain('crete');
    expect(searchable).toContain('cyclades');
    expect(greece.some((journey) => journey.mode === 'road')).toBe(true);
    expect(greece.some((journey) => journey.mode === 'sea')).toBe(true);
    expect(greece.some((journey) => journey.mode === 'rail')).toBe(true);
    expect(greece.some((journey) => journey.mode === 'air')).toBe(true);
  });

  it('keeps all world regions and travel modes meaningfully populated', () => {
    for (const mode of ['air', 'sea', 'rail', 'road']) {
      const count = catalog.filter((journey) => journey.mode === mode).length;
      expect(count).toBeGreaterThanOrEqual(12);
    }

    for (const region of [
      'Europe',
      'Asia',
      'Africa',
      'North America',
      'South America',
      'Oceania',
    ]) {
      const count = catalog.filter((journey) => journey.region === region).length;
      expect(count).toBeGreaterThanOrEqual(6);
    }
  });
});
