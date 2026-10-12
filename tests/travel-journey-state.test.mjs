import { describe, expect, it } from 'vitest';
import {
  createJourneyState,
  applyJourneyStatePatch,
  parseJourneyUrl,
  serializeJourneyUrl,
} from '../docs/travel/journey-state.js';

const fixed = new Date('2026-10-12T12:00:00Z');

describe('AGNES World state', () => {
  it('uses injected month and reconstructs cruise URLs', () => {
    expect(createJourneyState(fixed).month).toBe(10);
    expect(parseJourneyUrl('?view=cruises&port=limassol', fixed)).toMatchObject({
      view: 'cruises',
      departurePort: 'limassol',
    });
    expect(parseJourneyUrl('?view=nope&month=99', fixed)).toMatchObject({
      view: 'explore',
      month: 10,
    });
  });

  it('patches only validated structural values', () => {
    const state = applyJourneyStatePatch(createJourneyState(fixed), {
      view: 'mode',
      mode: 'sea',
      month: 7,
    });
    const bad = applyJourneyStatePatch(state, { view: 'wrong', mode: 'spaceship', month: 22 });
    expect(bad).toMatchObject({ view: 'mode', mode: 'sea', month: 7 });
    expect(serializeJourneyUrl({ ...bad, departurePort: 'limassol' })).toContain('port=limassol');
  });

  it('does not serialize a stale journey id after navigation leaves journey view', () => {
    const state = {
      ...createJourneyState(fixed),
      view: 'cruises',
      mode: 'sea',
      departurePort: 'limassol',
      journeyId: 'zagori-metsovo-meteora',
    };

    const url = serializeJourneyUrl(state);
    expect(url).toContain('view=cruises');
    expect(url).toContain('port=limassol');
    expect(url).not.toContain('journey=');
  });
});
