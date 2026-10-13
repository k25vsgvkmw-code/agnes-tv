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
      'hero', 'tall', 'wide', 'narrow', 'narrow',
      'bottom', 'bottom', 'bottom', 'bottom', 'bottom',
    ]);
    expect(APPROVED_AUTUMN_HOME.cards.map((card) => card.title)).toEqual([
      'Καταρράκτες του Φθινοπώρου', 'Τρόμσο', 'Άλπεις', 'Ελβετία', 'Δολομίτες',
      'Λίμνη Κόμο', 'Πλίτβιτσε', 'Ζερμάτ', 'Αμάλφι', 'Λοφότεν',
    ]);
    expect(APPROVED_AUTUMN_HOME.cards.every((card) => card.image)).toBe(true);
    expect(APPROVED_AUTUMN_HOME.cards.some((card) => card.image.includes('/zagori/'))).toBe(false);
  });

  it('renders exactly the approved ten-card editorial homepage with existing navigation hooks', () => {
    const html = renderExploreHome(JOURNEYS, state);
    expect(html.match(/class="editorial-destination-card /g) ?? []).toHaveLength(10);
    for (const card of APPROVED_AUTUMN_HOME.cards) {
      expect(html).toContain(`data-journey-id="${card.journeyId}"`);
      expect(html).toContain(card.title);
    }
    for (const month of ['Ιαν','Φεβ','Μαρ','Απρ','Μάι','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ']) {
      expect(html).toContain(month);
    }
    expect(html).toContain('Φθινόπωρο');
    expect(html).toContain('Ζήσε την ομορφιά της εποχής.');
    expect(html).toContain('data-global-search-form');
    expect(html).toContain('data-nav-view="destinations"');
    expect(html).toContain('data-nav-view="experiences"');
    expect(html).toContain('data-nav-view="saved"');
    expect(html).toContain('data-agnes-open');
    expect(html).toContain('data-month-jump="10"');
    expect(html).not.toContain('Προτεινόμενα ταξίδια');
    expect(html).not.toContain('recommended-journeys');
    expect(html).not.toContain('recommended-grid');
  });

  it('changes active month without changing curated card order or inventing live semantics', () => {
    const november = renderExploreHome(JOURNEYS, { ...state, month: 11 });
    expect(november).toContain('data-month-jump="11" class="is-active"');
    for (let index = 0; index < APPROVED_AUTUMN_HOME.cards.length; index += 1) {
      expect(november).toContain(`data-card-index="${index}"`);
      if (index > 0) {
        expect(november.indexOf(`data-card-index="${index - 1}"`)).toBeLessThan(
          november.indexOf(`data-card-index="${index}"`),
        );
      }
    }
    expect(november).toContain('editorial-card-badge" aria-hidden="true"');
    expect(november).not.toContain('editorial-card-badge" aria-live');
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
    expect(renderJourneyDetail({ ...journey, hero: { ...journey.hero, image: '' } }, state)).toContain(
      'data-image-fallback="true"',
    );
    const layer = renderOperationalLayer(journey, { ...state, detailLayer: 'day-plan' });
    expect(layer).toContain('aria-labelledby="operational-layer-title"');
    expect(layer).toContain('data-detail-close');
  });
});
