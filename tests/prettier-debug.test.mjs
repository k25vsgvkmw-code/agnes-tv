/* global URL */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import prettier from 'prettier';

describe('temporary prettier diagnostic', () => {
  it('shows the exact formatter output for the trip data test', async () => {
    const path = new URL('./travel-trip-data.test.mjs', import.meta.url);
    const source = await readFile(path, 'utf8');
    const formatted = await prettier.format(source, {
      parser: 'babel',
      printWidth: 100,
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
    });

    expect(source).toBe(formatted);
  });
});
