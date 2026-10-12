import { describe, expect, it } from 'vitest';
import { renderDestinations } from '../docs/travel/cinematic-render.js';
import { matchesJourneyRegion } from '../docs/travel/journey-region.js';
import { createJourneyState } from '../docs/travel/journey-state.js';

const sample = [
  {
    id: 'north',
    region: 'North America',
    mode: 'road',
    title: 'North Journey',
    subtitle: 'North',
    duration: '5 days',
    feelings: [],
    hero: { image: '' },
  },
  {
    id: 'south',
    region: 'South America',
    mode: 'air',
    title: 'South Journey',
    subtitle: 'South',
    duration: '6 days',
    feelings: [],
    hero: { image: '' },
  },
];

describe('Americas region aggregation', () => {
  it('treats North and South America as the Americas collection', () => {
    expect(matchesJourneyRegion('North America', 'Americas')).toBe(true);
    expect(matchesJourneyRegion('South America', 'Americas')).toBe(true);
    expect(matchesJourneyRegion('Europe', 'Americas')).toBe(false);
  });

  it('renders both American subregions under the Americas destination rail', () => {
    const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));
    const html = renderDestinations(sample, state);
    const americas = html.slice(html.indexOf('<h2>Americas</h2>'));
    expect(americas).toContain('North Journey');
    expect(americas).toContain('South Journey');
  });
});
