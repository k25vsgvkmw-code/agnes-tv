import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { JOURNEYS } from '../docs/travel/journeys-data.js';

describe('AGNES World editorial assets', () => {
  it('ships every hero locally with provenance metadata', async () => {
    const root = resolve(process.cwd(), 'docs/travel');
    const credits = JSON.parse(await readFile(resolve(root, 'assets/world/credits.json'), 'utf8'));
    for (const journey of JOURNEYS) {
      const path = journey.hero.image;
      expect(path.startsWith('assets/world/')).toBe(true);
      const file = await stat(resolve(root, path));
      expect(file.size).toBeGreaterThan(1000);
      const credit = credits[path.split('/').at(-1)];
      expect(credit).toMatchObject({
        creator: expect.any(String),
        sourceLabel: 'AGNES generated editorial asset',
        useNote: expect.any(String),
      });
    }
  });
});
