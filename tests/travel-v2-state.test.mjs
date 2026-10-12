import { describe, expect, it } from 'vitest';
import {
  applyJourneyStatePatch,
  createJourneyState,
  parseJourneyUrl,
  serializeJourneyUrl,
} from '../docs/travel/journey-state.js';

describe('AGNES World V2 navigation state', () => {
  it('round-trips search, saved and compare state', () => {
    const state = applyJourneyStatePatch(createJourneyState(new Date('2026-10-12')), {
      view: 'search',
      query: 'japan autumn',
      country: 'Japan',
      originId: 'station-tokyo',
      durationMin: 5,
      durationMax: 10,
      railStyle: 'scenic',
    });
    const url = serializeJourneyUrl(state);
    const parsed = parseJourneyUrl(url, new Date('2026-10-12'));
    expect(parsed.view).toBe('search');
    expect(parsed.query).toBe('japan autumn');
    expect(parsed.country).toBe('Japan');
    expect(parsed.originId).toBe('station-tokyo');
    expect(parsed.durationMin).toBe(5);
    expect(parsed.durationMax).toBe(10);
    expect(parsed.railStyle).toBe('scenic');
  });

  it('supports Saved and Compare views', () => {
    expect(parseJourneyUrl('?view=saved').view).toBe('saved');
    expect(parseJourneyUrl('?view=compare').view).toBe('compare');
  });

  it('ignores invalid values while preserving valid fields', () => {
    const parsed = parseJourneyUrl('?view=unknown&month=77&mode=rocket&region=Europe&extra=x');
    expect(parsed.view).toBe('explore');
    expect(parsed.mode).toBe('');
    expect(parsed.region).toBe('Europe');
  });
});
