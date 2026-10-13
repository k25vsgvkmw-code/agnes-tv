import { describe, expect, it } from 'vitest';
import { JOURNEYS, getJourneyById } from '../docs/travel/journeys-data.js';
import { createJourneyState } from '../docs/travel/journey-state.js';
import { APPROVED_AUTUMN_HOME } from '../docs/travel/homepage-curation.js';
import {
  renderExploreHome,
  renderJourneyDetail,
  renderOperationalLayer,
} from '../docs/travel/cinematic-render.js';

const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));

describe('cinematic world renderers', () => {
  it('defines the approved curated autumn homepage independent of catalog ranking', () => {
    expect(APPROVED_AUTUMN_HOME.activeMonth).toBe(10);
    expect(APPROVED_AUTUMN_HOME.cards).toHaveLength(10);
    expect(APPROVED_AUTUMN_HOME.cards.map((card) => card.role)).toEqual([
      'hero',
      'tall',
      'wide',
      'narrow',
      'narrow',
      'bottom',
      'bottom',
      'bottom',
      'bottom',
      'bottom',
    ]);
    expect(APPROVED_AUTUMN_HOME.cards.map((card) => card.title)).toEqual([
      'Καταρράκτες του Φθινοπώρου',
      'Τρόμσο',
      'Άλπεις',
      'Ελβετία',
      'Δολομίτες',
      'Λίμνη Κόμο',
      'Πλίτβιτσε',
      'Ζερμάτ',
      'Αμάλφι',
      'Λοφότεν',
    ]);
    expect(APPROVED_AUTUMN_HOME.cards.every((card) => card.image)).toBe(true);
    expect(APPROVED_AUTUMN_HOME.cards.some((card) => card.image.includes('/zagori/'))).toBe(false);
  });

  it('renders the approved autumn editorial homepage reference', () => {
    const html = renderExploreHome(JOURNEYS, state);
    for (const text of [
      'ΑΝΑΚΑΛΥΨΕ ΤΟΝ ΚΟΣΜΟ',
      'Φθινόπωρο',
      'Ζήσε την ομορφιά της εποχής.',
      'Καταρράκτες',
      'Άλπεις',
      'Road Trips',
      'Προτεινόμενα ταξίδια',
    ]) {
      expect(html).toContain(text);
    }
    for (const month of [
      'Ιαν',
      'Φεβ',
      'Μαρ',
      'Απρ',
      'Μάι',
      'Ιουν',
      'Ιουλ',
      'Αυγ',
      'Σεπ',
      'Οκτ',
      'Νοε',
      'Δεκ',
    ]) {
      expect(html).toContain(month);
    }
    expect(html).toContain('class="seasonal-mosaic"');
    expect(html).toContain('class="seasonal-card seasonal-card-hero"');
    expect(html).toContain('class="seasonal-card seasonal-card-tall"');
    expect(html).toContain('data-global-search-form');
    expect(html).toContain('data-month-jump="10"');
    expect(html).toContain('class="agnes-dock"');
    expect(html).not.toContain('Right Now · October');
    expect(html).not.toContain('Featured journeys');
    expect(html).not.toContain('AGNES Live');
  });

  it('shows a dense editorial mosaic plus recommended journeys', () => {
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
      hero: { image: 'assets/zagori/vikos-overlook.jpg' },
      pricing: { indicative: true, label: 'Plan with AGNES' },
    }));
    const html = renderExploreHome(sample, state);
    expect(html.match(/class="seasonal-card /g) ?? []).toHaveLength(10);
    expect(html.match(/class="recommended-card"/g) ?? []).toHaveLength(5);
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
