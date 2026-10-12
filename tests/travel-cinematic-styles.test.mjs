import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = await readFile(new URL('../docs/travel/cinematic.css', import.meta.url), 'utf8');
const seasonalCss = await readFile(
  new URL('../docs/travel/seasonal-editorial.css', import.meta.url),
  'utf8',
);

describe('AGNES World cinematic styles', () => {
  it('contains the shared dark system and accessible interaction rules', () => {
    for (const selector of [
      ':root',
      '.agnes-world-header',
      '.agnes-world-hero',
      '.journey-card',
      '.journey-detail',
      '.cruise-page',
      '.departure-port-rail',
      '.agnes-dock',
      '.operational-layer',
      ':focus-visible',
      'journey-media-fallback',
      'env(safe-area-inset-bottom)',
    ]) {
      expect(css).toContain(selector);
    }
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).not.toContain('#eef5ff');
  });

  it('keeps the seasonal AGNES copilot compact and contextual instead of a full-width black dock', () => {
    expect(seasonalCss).toContain('.agnes-dock.is-contextual');
    expect(seasonalCss).toContain('width: min(420px, calc(100% - 32px));');
    expect(seasonalCss).toContain('right: 18px;');
    expect(seasonalCss).toContain('background: rgba(255, 253, 250, 0.96);');
    expect(seasonalCss).toContain('.agnes-dock.is-expanded');
  });
});
