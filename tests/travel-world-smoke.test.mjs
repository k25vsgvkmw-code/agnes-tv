import { describe, expect, it } from 'vitest';
import { JOURNEYS } from '../docs/travel/journeys-data.js';
import { createJourneyState } from '../docs/travel/journey-state.js';
import { renderExploreHome } from '../docs/travel/cinematic-render.js';

describe('AGNES World smoke contract', () => {
  it('renders a global, multi-mode October editorial collection', () => {
    const html = renderExploreHome(JOURNEYS, createJourneyState(new Date('2026-10-12T12:00:00Z')));
    expect(html).toContain('ΑΝΑΚΑΛΥΨΕ ΤΟΝ ΚΟΣΜΟ');
    expect(html).toContain('Φθινόπωρο');
    expect(html).toContain('seasonal-mosaic');
    expect(html).toContain('Προτεινόμενα ταξίδια');
    for (const mode of ['air', 'sea', 'rail', 'road']) {
      expect(JOURNEYS.some((journey) => journey.mode === mode)).toBe(true);
    }
  });
});
