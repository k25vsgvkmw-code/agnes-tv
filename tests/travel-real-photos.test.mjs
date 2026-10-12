import { describe, expect, it } from 'vitest';
import { renderJourneyCard } from '../docs/travel/cinematic-render.js';
import { JOURNEYS } from '../docs/travel/journeys-data.js';

describe('AGNES journey photography', () => {
  it('renders real photography for the highest-priority journeys shown on the homepage', () => {
    const featured = [...JOURNEYS]
      .sort((a, b) => (b.editorialPriority ?? 0) - (a.editorialPriority ?? 0))
      .slice(0, 12);

    expect(featured).toHaveLength(12);
    for (const journey of featured) {
      const html = renderJourneyCard(journey);
      expect(html).toContain('<img src="https://');
      expect(html).not.toContain('assets/world/road.svg');
      expect(html).not.toContain('assets/world/rail.svg');
      expect(html).not.toContain('assets/world/sea.svg');
      expect(html).not.toContain('assets/world/air.svg');
    }
  });
});
