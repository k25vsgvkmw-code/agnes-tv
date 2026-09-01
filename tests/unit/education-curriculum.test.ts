import { describe, expect, it } from 'vitest';
import { getCatalogForGrade, getPage } from '../../src/education/seed-catalog.js';

describe('education curriculum catalog', () => {
  it('returns only Γ΄ resources for Vasilis grade C', () => {
    const resources = getCatalogForGrade('C');
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource.grade === 'C')).toBe(true);
  });

  it('returns only Α΄ resources for Elenios grade A', () => {
    const resources = getCatalogForGrade('A');
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource.grade === 'A')).toBe(true);
  });

  it('keeps source metadata on each resource', () => {
    const resource = getCatalogForGrade('C')[0];
    expect(resource?.source.attribution.length).toBeGreaterThan(0);
    expect(resource?.source.sourceUrl).toMatch(/^https:\/\//);
  });

  it('finds a page without mutating source content', () => {
    const page = getPage('math-c-01', 'math-c-01-p1');
    expect(page?.baseContent).toEqual({ type: 'agnes', ref: 'agnes://math-c-01-p1' });
  });
});
