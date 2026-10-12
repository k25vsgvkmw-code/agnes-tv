import { describe, expect, it } from 'vitest';
import { JOURNEYS } from '../docs/travel/journeys-data.js';

describe('AGNES journey photography', () => {
  it('uses real photography for the highest-priority journeys shown on the homepage', () => {
    const featured = [...JOURNEYS]
      .sort((a, b) => (b.editorialPriority ?? 0) - (a.editorialPriority ?? 0))
      .slice(0, 12);

    expect(featured).toHaveLength(12);
    for (const journey of featured) {
      expect(journey.hero?.image).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      expect(journey.hero?.image).not.toMatch(/\.svg(?:$|\?)/);
    }
  });
});
