import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { format } from 'prettier';

describe('prettier diagnostic', () => {
  it('shows the exact expected seasonality formatting', async () => {
    const path = 'tests/travel-seasonality.test.mjs';
    const source = await readFile(path, 'utf8');
    const formatted = await format(source, {
      filepath: path,
      printWidth: 100,
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
    });
    expect(source).toBe(formatted);
  });
});
