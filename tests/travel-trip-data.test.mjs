import { describe, expect, it } from 'vitest';
import { ZAGORI_TRIP, getRoadTripById } from '../docs/travel/trip-data.js';

const collectImages = (trip) => [
  trip.hero.image,
  ...trip.signatureMoments.map((item) => item.image),
  ...trip.itinerary.flatMap((day) => [day.image, day.stay?.image].filter(Boolean)),
].filter(Boolean);

describe('Zagori flagship road trip data', () => {
  it('exposes the approved trip identity and chapter structure', () => {
    const momentIds = ZAGORI_TRIP.signatureMoments.map((item) => item.id);
    const itineraryIds = ZAGORI_TRIP.itinerary.map((day) => day.id);

    expect(ZAGORI_TRIP.id).toBe('zagori-autumn');
    expect(ZAGORI_TRIP.signatureMoments).toHaveLength(3);
    expect(momentIds).toEqual(['vikos', 'zagori-metsovo-drive', 'meteora-light']);
    expect(ZAGORI_TRIP.itinerary[0].kind).toBe('departure');
    expect(ZAGORI_TRIP.itinerary.at(-1).kind).toBe('return');
    expect(ZAGORI_TRIP.itinerary).toHaveLength(7);
    expect(new Set(itineraryIds).size).toBe(itineraryIds.length);
  });

  it('contains the content required by the cinematic detail page', () => {
    const styleIds = ZAGORI_TRIP.styles.map((item) => item.id);
    const stopNames = ZAGORI_TRIP.route.stops.map((stop) => stop.name);
    const expectedStops = ['Ιωάννινα', 'Ζαγοροχώρια', 'Μέτσοβο', 'Μετέωρα'];
    const timelinesAreValid = ZAGORI_TRIP.itinerary.every((day) => {
      return Array.isArray(day.timeline) && day.timeline.length > 0;
    });
    const hasStay = ZAGORI_TRIP.itinerary.slice(0, -1).some((day) => day.stay);

    expect(ZAGORI_TRIP.hero.eyebrow).toBe('ΕΛΛΑΔΑ · ΗΠΕΙΡΟΣ');
    expect(ZAGORI_TRIP.hero.title).toContain('ΖΑΓΟΡΟΧΩΡΙΑ');
    expect(ZAGORI_TRIP.hero.story).toBeTruthy();
    expect(ZAGORI_TRIP.facts.length).toBeGreaterThanOrEqual(5);
    expect(styleIds).toEqual(['classic', 'suv', 'boutique', 'nature']);
    expect(stopNames).toEqual(expect.arrayContaining(expectedStops));
    expect(timelinesAreValid).toBe(true);
    expect(hasStay).toBe(true);
    expect(ZAGORI_TRIP.booking.priceLabel).toContain('ενδεικτικά');
    expect(ZAGORI_TRIP.agnes.quickActions).toHaveLength(6);
  });

  it('keeps rendered media local and credited', () => {
    const images = collectImages(ZAGORI_TRIP);

    expect(images.length).toBeGreaterThan(6);
    for (const image of images) {
      const filename = image.split('/').at(-1);
      const credit = ZAGORI_TRIP.mediaCredits[filename];

      expect(image.startsWith('assets/zagori/')).toBe(true);
      expect(image.startsWith('http://') || image.startsWith('https://')).toBe(false);
      expect(credit).toMatchObject({
        sourceUrl: expect.any(String),
        sourceLabel: expect.any(String),
        useNote: expect.any(String),
      });
    }
  });

  it('looks trips up by exact id', () => {
    expect(getRoadTripById('zagori-autumn')).toBe(ZAGORI_TRIP);
    expect(getRoadTripById('missing')).toBeNull();
  });
});
