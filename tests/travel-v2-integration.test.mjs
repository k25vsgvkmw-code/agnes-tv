import { describe, expect, it } from 'vitest';
import { renderExploreHome, renderGlobalHeader, renderJourneyDetail } from '../docs/travel/cinematic-render.js';
import { renderSearchPage } from '../docs/travel/search-render.js';

const journey = {
  id: 'demo',
  mode: 'rail',
  type: 'rail-journey',
  title: 'Autumn Rail',
  subtitle: 'Mountains in October',
  region: 'Europe',
  duration: '7 days',
  editorialPriority: 10,
  bestMonths: [10],
  shoulderMonths: [],
  availableMonths: [10],
  yearRound: false,
  feelings: ['slow'],
  hero: { image: '', eyebrow: 'BY RAIL' },
  signatureMoments: [],
  route: { stops: [{ id: 'a', name: 'Zurich', lat: 47.37, lng: 8.54 }, { id: 'b', name: 'Zermatt', lat: 46.02, lng: 7.75 }] },
  chapters: [],
  pricing: { disclaimer: 'Editorial journey. Live pricing requires a connected provider.' },
};
const state = { view: 'explore', month: 10, agnesHistory: [] };

describe('AGNES World V2 integrated experience', () => {
  it('exposes search and Saved from the global experience', () => {
    expect(renderGlobalHeader(state)).toContain('Saved');
    expect(renderExploreHome([journey], state)).toContain('data-global-search-form');
  });

  it('keeps search cinematic and reachable', () => {
    const html = renderSearchPage([journey], { ...state, query: 'autumn' }, { modes: ['rail'] });
    expect(html).toContain('AGNES WORLD SEARCH');
    expect(html).toContain('Autumn Rail');
  });

  it('includes an accessible route map and truthful commerce CTA in journey detail', () => {
    const html = renderJourneyDetail(journey, state);
    expect(html).toContain('aria-label="Journey route"');
    expect(html).toContain('Plan with AGNES');
    expect(html).not.toContain('Best price guaranteed');
  });
});
