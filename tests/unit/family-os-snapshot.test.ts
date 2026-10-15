import { describe, expect, it } from 'vitest';
import { createFallbackFamilyOsSnapshot } from '../../src/presentation/web/family-os-snapshot.js';

describe('createFallbackFamilyOsSnapshot', () => {
  it('contains every UI v1 Explore module without private household data', () => {
    const snapshot = createFallbackFamilyOsSnapshot(new Date('2026-09-05T06:58:00.000Z'));

    expect(snapshot.exploreModules.map((module) => module.id)).toEqual([
      'kids',
      'cooking',
      'travel',
      'tonight',
      'health',
      'calendar',
      'never-miss',
      'shop',
      'finance',
      'car',
      'smart-home',
      'pets',
      'music',
      'learning',
      'services',
      'translator',
      'memories',
    ]);
    expect(snapshot.members).toHaveLength(4);
    expect(snapshot.householdName).toBe('Family');
    expect(JSON.stringify(snapshot)).not.toContain('DATABASE_URL');
  });
});
