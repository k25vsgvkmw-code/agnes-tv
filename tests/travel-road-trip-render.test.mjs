import { describe, expect, it } from 'vitest';
import {
  renderAgnesDock,
  renderRoadTripDetail,
  renderTripHero,
} from '../docs/travel/road-trip-render.js';
import { ZAGORI_TRIP } from '../docs/travel/trip-data.js';
import { createTripState } from '../docs/travel/trip-state.js';

describe('cinematic road trip renderers', () => {
  it('renders the approved emotional-to-planning section order', () => {
    const html = renderRoadTripDetail(ZAGORI_TRIP, createTripState());
    const hero = html.indexOf('data-road-trip-section="hero"');
    const moments = html.indexOf('data-road-trip-section="signature-moments"');
    const styles = html.indexOf('data-road-trip-section="trip-styles"');
    const route = html.indexOf('data-road-trip-section="route"');
    const itinerary = html.indexOf('data-road-trip-section="itinerary"');
    const booking = html.indexOf('data-road-trip-section="booking"');

    expect(html).toContain('ΖΑΓΟΡΟΧΩΡΙΑ');
    expect(html).toContain('ΦΘΙΝΟΠΩΡΟ');
    expect(html).toContain('ΖΗΣΕ ΑΥΤΟ ΤΟ ROAD TRIP');
    expect(hero).toBeGreaterThanOrEqual(0);
    expect(hero).toBeLessThan(moments);
    expect(moments).toBeLessThan(styles);
    expect(styles).toBeLessThan(route);
    expect(route).toBeLessThan(itinerary);
    expect(itinerary).toBeLessThan(booking);
  });

  it('renders exactly three signature moments before planning controls', () => {
    const html = renderRoadTripDetail(ZAGORI_TRIP, createTripState());
    const moments = html.match(/data-signature-moment=/g) ?? [];

    expect(moments).toHaveLength(3);
    expect(html).toContain('Φαράγγι Βίκου');
    expect(html).toContain('Ζαγόρι → Μέτσοβο');
    expect(html).toContain('Πρωινή ομίχλη στα Μετέωρα');
  });

  it('renders the route, departure-to-return itinerary and booking close', () => {
    const html = renderRoadTripDetail(ZAGORI_TRIP, createTripState());

    for (const stop of ['Ιωάννινα', 'Ζαγοροχώρια', 'Μέτσοβο', 'Μετέωρα']) {
      expect(html).toContain(stop);
    }
    expect(html).toContain('data-itinerary-day="departure"');
    expect(html).toContain('data-itinerary-day="return"');
    expect(html).toContain('ΚΛΕΙΣΕ ΤΟ ROAD TRIP');
  });

  it('renders visible creator, license and Wikimedia attribution for local photography', () => {
    const html = renderRoadTripDetail(ZAGORI_TRIP, createTripState());

    expect(html).toContain('data-photo-credits');
    expect(html).toContain('Aneza Palaiou');
    expect(html).toContain('Apostolos Palaskas');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('CC BY-SA 3.0');
    expect(html).toContain('Wikimedia Commons');
    expect(html).toContain('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(html).toContain('https://creativecommons.org/licenses/by-sa/3.0/');
  });

  it('labels the assistant as AGNES without implying a live model', () => {
    const html = renderAgnesDock(ZAGORI_TRIP, createTripState());

    expect(html).toContain('AGNES');
    expect(html).not.toContain('AGNES Live');
    expect(html).toContain('data-agnes-input');
    expect(html).toContain('data-agnes-send');
  });

  it('renders only the latest exchange so AGNES visibly answers without flooding the dock', () => {
    const state = createTripState();
    state.agnesHistory = [
      { role: 'user', text: 'old question' },
      { role: 'agnes', text: 'old reply' },
      { role: 'user', text: 'latest question' },
      { role: 'agnes', text: 'latest reply' },
    ];
    const html = renderAgnesDock(ZAGORI_TRIP, state);

    expect(html).not.toContain('old question');
    expect(html).not.toContain('old reply');
    expect(html).toContain('latest question');
    expect(html).toContain('latest reply');
  });

  it('shows a visible itinerary adaptation when rainy-day mode is active', () => {
    const state = createTripState();
    state.weatherMode = 'rain';
    const html = renderRoadTripDetail(ZAGORI_TRIP, state);

    expect(html).toContain('Rain plan ενεργό');
    expect(html).toContain('κρατά ευέλικτα τα viewpoints');
  });

  it('escapes free-text AGNES history before rendering', () => {
    const state = createTripState();
    state.agnesHistory = [{ role: 'user', text: '<script>alert("x")</script>' }];
    const html = renderAgnesDock(ZAGORI_TRIP, state);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('keeps hero copy readable when the image is missing', () => {
    const trip = {
      ...ZAGORI_TRIP,
      hero: { ...ZAGORI_TRIP.hero, image: '' },
    };
    const html = renderTripHero(trip, createTripState());

    expect(html).toContain('ΖΑΓΟΡΟΧΩΡΙΑ');
    expect(html).toContain('data-image-fallback="true"');
  });
});
