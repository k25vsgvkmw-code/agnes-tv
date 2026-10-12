import { describe, expect, it } from 'vitest';
import { buildSearchIndex, searchJourneys } from '../docs/travel/search-index.js';
import { renderSearchPage } from '../docs/travel/search-render.js';

const catalog = {
  destinations: [
    {
      id: 'gr-santorini',
      name: 'Santorini',
      countryName: 'Greece',
      region: 'Greece',
      tags: ['islands', 'romantic'],
    },
    {
      id: 'jp-kyoto',
      name: 'Kyoto',
      countryName: 'Japan',
      region: 'Asia',
      tags: ['culture'],
    },
  ],
  origins: [
    {
      id: 'port-limassol',
      type: 'port',
      name: 'Limassol',
      city: 'Limassol',
      countryCode: 'CY',
    },
    {
      id: 'station-tokyo',
      type: 'station',
      name: 'Tokyo Station',
      city: 'Tokyo',
      countryCode: 'JP',
    },
  ],
  journeys: [
    {
      id: 'aegean',
      title: 'Aegean Escape',
      subtitle: 'Island light',
      mode: 'sea',
      type: 'cruise',
      region: 'Greece',
      countries: ['Greece'],
      destinationIds: ['gr-santorini'],
      originIds: ['port-limassol'],
      feelings: ['romantic'],
      styles: ['island'],
      editorialPriority: 20,
      hero: { image: '' },
      duration: '7 nights',
    },
    {
      id: 'japan',
      title: 'Japan Rail Escape',
      subtitle: 'Temple mornings',
      mode: 'rail',
      type: 'rail-journey',
      region: 'Asia',
      countries: ['Japan'],
      destinationIds: ['jp-kyoto'],
      originIds: ['station-tokyo'],
      feelings: ['slow'],
      styles: ['scenic'],
      editorialPriority: 20,
      hero: { image: '' },
      duration: '10 days',
    },
  ],
};

const index = buildSearchIndex(catalog);

describe('AGNES World V2 global search', () => {
  it.each([
    ['Santorini', 'aegean'],
    ['Greece', 'aegean'],
    ['Limassol', 'aegean'],
    ['port', 'aegean'],
    ['Japan', 'japan'],
    ['Kyoto', 'japan'],
    ['Tokyo Station', 'japan'],
    ['station', 'japan'],
    ['romantic', 'aegean'],
    ['scenic', 'japan'],
    ['rail', 'japan'],
  ])('searches %s across normalized fields', (query, expectedId) => {
    expect(searchJourneys(index, query, {})[0]?.id).toBe(expectedId);
  });

  it('is case-insensitive and accent-tolerant', () => {
    const accentedCatalog = {
      ...catalog,
      destinations: [
        ...catalog.destinations,
        { id: 'es-malaga', name: 'Málaga', countryName: 'Spain', region: 'Europe', tags: [] },
      ],
      journeys: [
        ...catalog.journeys,
        {
          ...catalog.journeys[0],
          id: 'malaga',
          title: 'Málaga Coast',
          region: 'Europe',
          countries: ['Spain'],
          destinationIds: ['es-malaga'],
          originIds: [],
        },
      ],
    };
    expect(searchJourneys(buildSearchIndex(accentedCatalog), 'MALAGA', {})[0]?.id).toBe('malaga');
  });

  it('treats empty query plus filters as faceted browse', () => {
    expect(searchJourneys(index, '', { mode: 'rail' }).map((journey) => journey.id)).toEqual([
      'japan',
    ]);
  });

  it('renders editorial results and filter hooks', () => {
    const html = renderSearchPage(catalog.journeys, { query: 'islands', mode: 'sea' }, {});
    expect(html).toContain('Search the world');
    expect(html).toContain('data-search-filter');
    expect(html).toContain('Aegean Escape');
  });
});
