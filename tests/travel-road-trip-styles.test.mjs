import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssUrl = new URL('../docs/travel/styles.css', import.meta.url);
const css = await readFile(cssUrl, 'utf8');

describe('cinematic road-trip responsive styles', () => {
  it('scopes the cinematic design to road-trip components', () => {
    for (const selector of [
      '.road-trip-page',
      '.road-trip-hero',
      '.rt-signature-grid',
      '.rt-style-grid',
      '.rt-route-canvas',
      '.rt-day-list',
      '.rt-booking',
      '.rt-agnes-dock',
    ]) {
      expect(css).toContain(selector);
    }
  });

  it('includes mobile breakpoints and horizontal style-card behavior', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).toContain('scroll-snap-type: x mandatory');
    expect(css).toContain('padding-bottom: 190px');
  });

  it('styles local photography with readable overlays and fallbacks', () => {
    expect(css).toContain('.rt-media img');
    expect(css).toContain('.rt-media-fallback');
    expect(css).toContain('.rt-hero-scrim');
    expect(css).toContain('.rt-signature-scrim');
  });
});
