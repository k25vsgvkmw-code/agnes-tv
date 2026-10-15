import { describe, expect, it } from 'vitest';
import { createFallbackFamilyOsSnapshot } from '../../src/presentation/web/family-os-snapshot.js';
import { renderFamilyOs } from '../../src/presentation/web/render-family-os.js';

describe('renderFamilyOs', () => {
  it('renders the unified primary navigation and every Explore module', () => {
    const snapshot = createFallbackFamilyOsSnapshot(new Date('2026-09-05T06:58:00.000Z'));
    const html = renderFamilyOs(snapshot);

    expect(html).toContain('data-nav="home"');
    expect(html).toContain('data-nav="today"');
    expect(html).toContain('data-nav="family"');
    expect(html).toContain('data-nav="explore"');
    expect(html).toContain('data-view="home"');
    expect(html).toContain('data-view="today"');
    expect(html).toContain('data-view="family"');
    expect(html).toContain('data-view="explore"');
    expect(html).toContain('data-agnes-control');

    for (const module of snapshot.exploreModules) {
      expect(html).toContain(`data-module="${module.id}"`);
    }
  });

  it('escapes externally supplied presentation text', () => {
    const snapshot = createFallbackFamilyOsSnapshot();
    const html = renderFamilyOs({ ...snapshot, householdName: '<script>alert(1)</script>' });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
