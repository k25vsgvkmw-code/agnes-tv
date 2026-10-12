import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = await readFile(new URL('../docs/travel/photo-pack.css', import.meta.url), 'utf8');
const credits = JSON.parse(
  await readFile(new URL('../docs/travel/assets/world/photo-credits.json', import.meta.url), 'utf8'),
);

describe('AGNES World photo pack', () => {
  it('uses real destination photography for the seasonal hero and key journey cards', () => {
    expect(css).toContain('.agnes-world-hero-media');
    expect(css).toContain('[data-journey-id="norway-fjords-rail"]');
    expect(css).toContain('[data-journey-id="japan-islands-yokohama"]');
    expect(css).toContain('[data-journey-id="morocco-atlas-sahara"]');
    expect(css).toContain('images.unsplash.com');
    expect(css).toContain('opacity: 0;');
  });

  it('records provenance for every production photo source', () => {
    expect(Array.isArray(credits)).toBe(true);
    expect(credits.length).toBeGreaterThanOrEqual(5);
    for (const photo of credits) {
      expect(photo).toHaveProperty('id');
      expect(photo).toHaveProperty('photographer');
      expect(photo).toHaveProperty('sourceUrl');
      expect(photo).toHaveProperty('license', 'Unsplash License');
    }
  });
});
