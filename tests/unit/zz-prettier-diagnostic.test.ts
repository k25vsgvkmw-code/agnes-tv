import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { format, resolveConfig } from 'prettier';

const targets = [
  'tests/unit/education-routes.test.ts',
  'tests/unit/education-service.test.ts',
] as const;

describe('prettier diagnostic', () => {
  it('prints canonical formatting for education tests', async () => {
    for (const file of targets) {
      const source = await readFile(file, 'utf8');
      const config = (await resolveConfig(file)) ?? {};
      const formatted = await format(source, { ...config, filepath: file });
      console.log(`PRETTIER_BEGIN:${file}\n${formatted}PRETTIER_END:${file}`);
    }
    expect(true).toBe(true);
  });
});
