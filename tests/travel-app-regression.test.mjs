import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const appUrl = new URL('../docs/travel/app.js', import.meta.url);
const appSource = await readFile(appUrl, 'utf8');

describe('Travel app road-trip integration', () => {
  it('preserves all legacy top-level views', () => {
    for (const view of ['home', 'destinations', 'map', 'prices', 'compare', 'ready']) {
      expect(appSource).toContain(`${view}:`);
    }
    expect(appSource).toContain('function detail(');
    expect(appSource).toContain('rankDestinations');
  });

  it('imports and mounts the Zagori road-trip modules', () => {
    expect(appSource).toContain("from './trip-data.js'");
    expect(appSource).toContain("from './trip-state.js'");
    expect(appSource).toContain("from './agnes-trip.js'");
    expect(appSource).toContain("from './road-trip-render.js'");
    expect(appSource).toContain('function mountRoadTrip(');
    expect(appSource).toContain('data-road-trip-id="zagori-autumn"');
  });

  it('wires style, day and AGNES controls through trip state', () => {
    expect(appSource).toContain('[data-trip-style]');
    expect(appSource).toContain('[data-day-select]');
    expect(appSource).toContain('[data-agnes-action]');
    expect(appSource).toContain('[data-agnes-form]');
    expect(appSource).toContain('handleAgnesMessage');
    expect(appSource).toContain('applyTripStatePatch');
  });

  it('keeps the first release honest about booking and assistant capability', () => {
    expect(appSource).not.toContain('AGNES Live');
    expect(appSource).toContain('booking-inquiry');
    expect(appSource).toContain('ενδεικτικ');
  });
});
