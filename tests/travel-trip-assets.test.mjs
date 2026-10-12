import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZAGORI_TRIP } from '../docs/travel/trip-data.js';

function imagePaths(trip) {
  return [
    trip.hero.image,
    ...trip.signatureMoments.map((item) => item.image),
    ...trip.itinerary.flatMap((day) => [day.image, day.stay?.image].filter(Boolean)),
  ];
}

describe('Zagori local photography assets', () => {
  it('ships every rendered image locally with exact credit metadata', async () => {
    const root = resolve(process.cwd(), 'docs/travel');
    const creditsPath = resolve(root, 'assets/zagori/credits.json');
    const credits = JSON.parse(await readFile(creditsPath, 'utf8'));
    const paths = [...new Set(imagePaths(ZAGORI_TRIP))];

    expect(paths.length).toBeGreaterThanOrEqual(5);

    for (const imagePath of paths) {
      expect(imagePath.startsWith('assets/zagori/')).toBe(true);
      const filename = imagePath.split('/').at(-1);
      const file = await stat(resolve(root, imagePath));
      const credit = credits[filename];

      expect(file.isFile()).toBe(true);
      expect(file.size).toBeGreaterThan(20_000);
      expect(credit).toMatchObject({
        creator: expect.any(String),
        license: expect.stringMatching(/CC/),
        sourceUrl: expect.stringMatching(/^https:\/\/commons\.wikimedia\.org\//),
        sourceLabel: 'Wikimedia Commons',
      });
      expect(credit.creator.length).toBeGreaterThan(1);
    }
  });
});
