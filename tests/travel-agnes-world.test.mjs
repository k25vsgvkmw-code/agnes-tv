import { describe, expect, it } from 'vitest';
import { JOURNEYS, getJourneyById } from '../docs/travel/journeys-data.js';
import { createJourneyState } from '../docs/travel/journey-state.js';
import { handleJourneyAgnesMessage } from '../docs/travel/agnes-journey.js';

const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));

describe('AGNES World deterministic intents', () => {
  it.each([
    ['Show cruises from Limassol', { view: 'cruises', mode: 'sea', departurePort: 'limassol' }],
    ['I want mountains by train', { view: 'mode', mode: 'rail', feeling: 'mountains' }],
    [
      'I want sea and islands in October',
      { view: 'mode', mode: 'sea', month: 10, feeling: 'islands' },
    ],
  ])('maps %s safely', (message, patch) => {
    expect(
      handleJourneyAgnesMessage(message, { journey: null, journeys: JOURNEYS, state }).statePatch,
    ).toEqual(patch);
  });

  it('returns bounded capabilities without mutating state', () => {
    const snapshot = JSON.stringify(state);
    const result = handleJourneyAgnesMessage('book helicopter and private chef', {
      journey: getJourneyById('zagori-metsovo-meteora'),
      journeys: JOURNEYS,
      state,
    });
    expect(result.statePatch).toEqual({});
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(result.reply.toLowerCase()).not.toMatch(/live|confirmed|booked/);
  });
});
