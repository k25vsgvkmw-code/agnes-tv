import { describe, expect, it } from 'vitest';
import { JOURNEYS, getJourneyById } from '../docs/travel/journeys-data.js';
import { createJourneyState } from '../docs/travel/journey-state.js';
import {
  renderExploreHome,
  renderJourneyDetail,
  renderOperationalLayer,
} from '../docs/travel/cinematic-render.js';

const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));

describe('cinematic world renderers', () => {
  it('renders seasonal V2 Explore without legacy dashboard copy and keeps AGNES available', () => {
    const html = renderExploreHome(JOURNEYS, state);
    for (const text of [
      'AGNES WORLD',
      'October',
      'Travel when the world is at its best.',
      'Right Now · October',
      'Featured journeys',
      'Europe',
      'Greece',
      'Asia',
      'Africa',
      'Americas',
      'Oceania',
    ]) {
      expect(html).toContain(text);
    }
    for (const mode of ['air', 'sea', 'rail', 'road']) {
      expect(html).toContain(`data-mode="${mode}"`);
    }
    expect(html).toContain('data-global-search-form');
    expect(html).toContain('data-month-jump="10"');
    expect(html).toContain('class="agnes-dock"');
    expect(html).toContain('data-agnes-input');
    expect(html).not.toContain('93 προορισμοί από Λάρνακα');
    expect(html).not.toContain('AGNES Live');
  });

  it('shows twelve choices in each main seasonal collection when content is available', () => {
    const sample = Array.from({ length: 14 }, (_, index) => ({
      id: `sample-${index}`,
      mode: ['air', 'sea', 'rail', 'road'][index % 4],
      type: 'journey',
      title: `Journey ${index}`,
      subtitle: 'Seasonal journey',
      region: 'Europe',
      duration: '7 days',
      editorialPriority: 100 - index,
      bestMonths: [10],
      shoulderMonths: [],
      availableMonths: [10],
      yearRound: false,
      feelings: ['seasonal'],
      hero: { image: '' },
    }));
    const html = renderExploreHome(sample, state);
    const rightNow = html.split('<h2>Right Now · October</h2>')[1].split('</section>')[0];
    const featured = html.split('<h2>Featured journeys</h2>')[1].split('</section>')[0];
    expect(rightNow.match(/class="journey-card"/g) ?? []).toHaveLength(12);
    expect(featured.match(/class="journey-card"/g) ?? []).toHaveLength(12);
  });

  it('renders emotional-to-operational journey detail', () => {
    const html = renderJourneyDetail(getJourneyById('zagori-metsovo-meteora'), state);
    expect(html.match(/data-signature-moment=/g) ?? []).toHaveLength(3);
    expect(html.indexOf('data-journey-section="hero"')).toBeLessThan(
      html.indexOf('data-journey-section="route"'),
    );
    expect(html).toContain('data-chapter-id="departure"');
    expect(html).toContain('data-chapter-id="return"');
  });

  it('keeps content readable without hero media and labels dialog', () => {
    const journey = getJourneyById('zagori-metsovo-meteora');
    expect(
      renderJourneyDetail({ ...journey, hero: { ...journey.hero, image: '' } }, state),
    ).toContain('data-image-fallback="true"');
    const layer = renderOperationalLayer(journey, { ...state, detailLayer: 'day-plan' });
    expect(layer).toContain('aria-labelledby="operational-layer-title"');
    expect(layer).toContain('data-detail-close');
  });
});
