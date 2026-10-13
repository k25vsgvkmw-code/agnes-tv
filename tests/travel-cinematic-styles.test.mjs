import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = await readFile(new URL('../docs/travel/cinematic.css', import.meta.url), 'utf8');
const contextualCss = await readFile(new URL('../docs/travel/agnes-contextual.css', import.meta.url), 'utf8');
const editorialCss = await readFile(new URL('../docs/travel/approved-autumn.css', import.meta.url), 'utf8');
const index = await readFile(new URL('../docs/travel/index.html', import.meta.url), 'utf8');

describe('AGNES World cinematic styles', () => {
  it('contains the shared cinematic system and accessible interaction rules', () => {
    for (const selector of [
      ':root', '.agnes-world-header', '.agnes-world-hero', '.journey-card', '.journey-detail',
      '.cruise-page', '.departure-port-rail', '.agnes-dock', '.operational-layer', ':focus-visible',
      'journey-media-fallback', 'env(safe-area-inset-bottom)',
    ]) expect(css).toContain(selector);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).not.toContain('#eef5ff');
  });

  it('keeps the seasonal AGNES copilot compact and contextual instead of a full-width black dock', () => {
    expect(index).toContain('agnes-contextual.css');
    expect(contextualCss).toContain('.agnes-dock.is-contextual');
    expect(contextualCss).toContain('width: min(420px, calc(100% - 32px));');
    expect(contextualCss).toContain('right: 18px;');
    expect(contextualCss).toContain('background: rgba(255, 253, 250, 0.96);');
    expect(contextualCss).toContain('.agnes-dock.is-expanded');
    expect(contextualCss).toContain('.agnes-dock:focus-within');
    expect(contextualCss).toContain('.agnes-dock-title');
  });

  it('locks the approved cream and rust 12-column editorial composition', () => {
    for (const value of [
      '#F7F4EF', '#171411', '#AD4C27', 'grid-template-columns: repeat(12',
      '.editorial-card--hero', '.editorial-card--tall', '.editorial-card--wide',
      '.editorial-card--narrow', '.editorial-card--bottom', 'width: calc(20% - 8px)',
    ]) expect(editorialCss).toContain(value);
    expect(editorialCss).not.toContain('.recommended-grid');
    expect(editorialCss).not.toContain('background: #000');
  });

  it('collapses to one cinematic column on mobile and protects reduced-motion users', () => {
    expect(editorialCss).toContain('@media (max-width: 760px)');
    expect(editorialCss).toContain('.month-rail-months');
    expect(editorialCss).toContain('overflow-x: auto;');
    expect(editorialCss).toContain('flex-direction: column;');
    expect(editorialCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(editorialCss).toContain('transform: none !important;');
    expect(editorialCss).toContain('overflow-x: hidden;');
  });
});
