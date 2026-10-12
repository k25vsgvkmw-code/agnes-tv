import { describe, expect, it } from 'vitest';
import { ZAGORI_TRIP } from '../docs/travel/trip-data.js';
import {
  applyTripStatePatch,
  createTripState,
  deriveVisibleItinerary,
} from '../docs/travel/trip-state.js';

describe('road trip state', () => {
  it('creates the approved default Zagori state', () => {
    expect(createTripState()).toEqual({
      tripId: 'zagori-autumn',
      style: 'classic',
      duration: 5,
      audience: 'couple',
      drivingPace: 'balanced',
      stayTier: 'boutique',
      weatherMode: 'normal',
      selectedDay: 'departure',
      agnesHistory: [],
    });
  });

  it('applies valid patches immutably', () => {
    const original = createTripState();
    const next = applyTripStatePatch(original, {
      style: 'nature',
      stayTier: 'premium',
      audience: 'family',
    });

    expect(next).not.toBe(original);
    expect(next).toMatchObject({
      style: 'nature',
      stayTier: 'premium',
      audience: 'family',
    });
    expect(original).toMatchObject({
      style: 'classic',
      stayTier: 'boutique',
      audience: 'couple',
    });
  });

  it('rejects unsupported state values without corrupting valid state', () => {
    const original = applyTripStatePatch(createTripState(), { style: 'suv', duration: 4 });
    const next = applyTripStatePatch(original, {
      style: 'spaceship',
      duration: 9,
      audience: 'crowd',
      drivingPace: 'rush',
      stayTier: 'palace',
      weatherMode: 'storm-chaser',
    });

    expect(next).toMatchObject({
      style: 'suv',
      duration: 4,
      audience: 'couple',
      drivingPace: 'balanced',
      stayTier: 'boutique',
      weatherMode: 'normal',
    });
  });

  it('derives a four-night itinerary while preserving departure and return', () => {
    const state = applyTripStatePatch(createTripState(), { duration: 4 });
    const itinerary = deriveVisibleItinerary(ZAGORI_TRIP, state);

    expect(itinerary[0].kind).toBe('departure');
    expect(itinerary.at(-1).kind).toBe('return');
    expect(itinerary.map((day) => day.id)).toEqual([
      'departure',
      'day-1',
      'day-2',
      'day-3',
      'day-4',
      'return',
    ]);
  });

  it('adds relaxed-driving presentation without mutating canonical trip data', () => {
    const sourceSnapshot = JSON.stringify(ZAGORI_TRIP.itinerary);
    const state = applyTripStatePatch(createTripState(), { drivingPace: 'relaxed' });
    const itinerary = deriveVisibleItinerary(ZAGORI_TRIP, state);
    const dayTwo = itinerary.find((day) => day.id === 'day-2');

    expect(dayTwo.paceNote).toBe('Χαλαρός ρυθμός · λιγότερες στάσεις');
    expect(dayTwo.timeline.length).toBeLessThan(ZAGORI_TRIP.itinerary[2].timeline.length);
    expect(JSON.stringify(ZAGORI_TRIP.itinerary)).toBe(sourceSnapshot);
  });
});
