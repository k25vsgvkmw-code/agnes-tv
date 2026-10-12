import { describe, expect, it } from 'vitest';
import { handleAgnesMessage } from '../docs/travel/agnes-trip.js';
import { ZAGORI_TRIP } from '../docs/travel/trip-data.js';
import { createTripState } from '../docs/travel/trip-state.js';

const cases = [
  ['Κάν’ το 4ήμερο', { duration: 4 }, 'itinerary'],
  ['Θέλω λιγότερη οδήγηση', { drivingPace: 'relaxed' }, 'itinerary'],
  ['Κάν’ το πιο romantic', { audience: 'couple' }, 'trip-style'],
  ['Θέλω καλύτερα ξενοδοχεία', { stayTier: 'premium' }, 'stays'],
  ['Προσαρμογή για παιδιά', { audience: 'family' }, 'itinerary'],
  ['Τι αλλάζεις αν βρέχει;', { weatherMode: 'rain' }, 'itinerary'],
];

describe('AGNES deterministic road trip adapter', () => {
  it.each(cases)('maps %s to a safe trip-state patch', (message, statePatch, focusTarget) => {
    const result = handleAgnesMessage(message, ZAGORI_TRIP, createTripState());

    expect(result.statePatch).toEqual(statePatch);
    expect(result.focusTarget).toBe(focusTarget);
    expect(result.reply.length).toBeGreaterThan(20);
  });

  it('recognizes simple English duration wording', () => {
    const result = handleAgnesMessage('Make it 4 days', ZAGORI_TRIP, createTripState());

    expect(result.statePatch).toEqual({ duration: 4 });
    expect(result.focusTarget).toBe('itinerary');
  });

  it('returns bounded capabilities for unsupported mixed-language input', () => {
    const state = createTripState();
    const snapshot = JSON.stringify(state);
    const result = handleAgnesMessage(
      'Can you book me a helicopter και private chef;',
      ZAGORI_TRIP,
      state,
    );

    expect(result.statePatch).toEqual({});
    expect(result.focusTarget).toBe('agnes');
    expect(result.reply).toContain('διάρκεια');
    expect(result.reply).toContain('οδήγηση');
    expect(result.reply).toContain('διαμονή');
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('does not imply a live model or booking capability', () => {
    const result = handleAgnesMessage('τι άλλο μπορείς να κάνεις;', ZAGORI_TRIP, createTripState());
    const text = result.reply.toLowerCase();

    expect(text).not.toContain('live');
    expect(text).not.toContain('κλείνω για εσένα');
    expect(result.statePatch).toEqual({});
  });
});
