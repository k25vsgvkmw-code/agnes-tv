import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../docs/travel/app.js', import.meta.url), 'utf8');

describe('Travel app AGNES World regression contract', () => {
  it('uses the generic AGNES World orchestration instead of the old dashboard default', () => {
    expect(source).toContain('renderExploreHome');
    expect(source).toContain('renderCruiseLanding');
    expect(source).toContain('renderJourneyDetail');
    expect(source).not.toContain('93 προορισμοί από Λάρνακα');
  });

  it('keeps the first release truthful', () => {
    expect(source).not.toContain('AGNES Live');
    expect(source).not.toContain('Pay now');
    expect(source).toContain('Journey not found');
  });
});
