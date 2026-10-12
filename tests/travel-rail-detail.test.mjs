import { describe, expect, it } from 'vitest';
import { createJourneyState } from '../docs/travel/journey-state.js';
import { getJourneyById } from '../docs/travel/journeys-data.js';
import { renderRailDetail } from '../docs/travel/rail-render.js';

const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));

describe('AGNES rail journey detail', () => {
  it('renders a rail-first editorial story before practical planning', () => {
    const journey = getJourneyById('switzerland-grand-rail');
    const html = renderRailDetail(journey, state);
    const viewIndex = html.indexOf('THE VIEW FROM THE WINDOW');
    const routeIndex = html.indexOf('THE ROUTE');
    const inquiryIndex = html.indexOf('YOUR JOURNEY');

    expect(html).toContain('journey-detail is-rail');
    expect(html).toContain('RAIL JOURNEY');
    expect(html).toContain('THE VIEW FROM THE WINDOW');
    expect(html).toContain('WHY THIS JOURNEY NOW');
    expect(html).toContain('Slow travel, edited by AGNES.');
    expect(viewIndex).toBeLessThan(routeIndex);
    expect(routeIndex).toBeLessThan(inquiryIndex);
    expect(html).not.toContain('Book now');
    expect(html).not.toContain('Select cabin');
  });
});
