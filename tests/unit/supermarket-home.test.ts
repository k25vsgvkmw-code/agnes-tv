import { describe, expect, it } from 'vitest';
import { seasonalThemeFor } from '../../src/shopping/supermarket-home.js';

describe('supermarket seasonal presentation', () => {
  it('uses late-summer colors at the end of August', () => {
    expect(seasonalThemeFor(new Date('2026-08-31T12:00:00Z'))).toMatchObject({
      seasonKey: 'late_summer',
      accentFamily: 'sunset-peach-olive-green',
    });
  });

  it('changes the visual family for Christmas', () => {
    expect(seasonalThemeFor(new Date('2026-12-20T12:00:00Z')).seasonKey).toBe('christmas');
  });
});
