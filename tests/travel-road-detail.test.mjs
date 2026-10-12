import { describe, expect, it } from 'vitest';
import { createJourneyState } from '../docs/travel/journey-state.js';
import { getJourneyById } from '../docs/travel/journeys-data.js';
import { renderRoadDetail } from '../docs/travel/road-render.js';

const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));

describe('AGNES road journey detail', () => {
  it('renders a road-first editorial story before practical planning', () => {
    const journey = getJourneyById('iceland-ring-road');
    const html = renderRoadDetail(journey, state);

    expect(html).toContain('journey-detail is-road');
    expect(html).toContain('ROAD JOURNEY');
    expect(html).toContain('THE ROAD AHEAD');
    expect(html).toContain('BEST STOPS');
    expect(html).toContain('WHY THIS JOURNEY NOW');
    expect(html).toContain('DRIVING RHYTHM');
    expect(html.indexOf('THE ROAD AHEAD')).toBeLessThan(
      html.indexOf('THE ROUTE'),
    );
    expect(html.indexOf('THE ROUTE')).toBeLessThan(
      html.indexOf('YOUR JOURNEY'),
    );
    expect(html).not.toContain('Book now');
    expect(html).not.toContain('Select vehicle');
  });
});
