import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../docs/travel/app.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../docs/travel/index.html', import.meta.url), 'utf8');

describe('AGNES World app integration', () => {
  it('imports the generic world pipeline', () => {
    for (const path of [
      './journeys-data.js',
      './seasonality.js',
      './journey-state.js',
      './agnes-journey.js',
      './cinematic-render.js',
      './cruise-render.js',
    ]) {
      expect(source).toContain(path);
    }
  });

  it('wires URL, mode, journey, cruise and operational events', () => {
    for (const hook of [
      'data-mode',
      'data-journey-id',
      'data-port-select',
      'data-open-layer',
      'data-detail-close',
      'popstate',
      'history.pushState',
      'Journey not found',
    ]) {
      expect(source).toContain(hook);
    }
  });

  it('loads the global shell and cinematic stylesheet', () => {
    expect(index).toContain('<title>AGNES World</title>');
    expect(index).toContain('cinematic.css');
    expect(index).toContain('#07090d');
  });
});
