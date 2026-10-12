import { describe, expect, it } from 'vitest';
import {
  SAVED_STORAGE_KEY,
  loadSavedState,
  removeSavedJourney,
  saveJourney,
  toggleCompareJourney,
} from '../docs/travel/saved-journeys.js';
import { renderSavedPage } from '../docs/travel/compare-render.js';

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe('AGNES World V2 saved journeys', () => {
  it('saves, reloads and removes journey ids', () => {
    const storage = memoryStorage();
    saveJourney('one', storage);
    saveJourney('two', storage);
    expect(loadSavedState(storage).saved).toEqual(['one', 'two']);
    removeSavedJourney('one', storage);
    expect(loadSavedState(storage).saved).toEqual(['two']);
  });

  it('limits compare shortlist to three journeys', () => {
    const storage = memoryStorage();
    for (const id of ['one', 'two', 'three', 'four']) toggleCompareJourney(id, storage);
    expect(loadSavedState(storage).compare).toEqual(['two', 'three', 'four']);
  });

  it('fails closed on corrupt or old storage payloads', () => {
    const corrupt = memoryStorage({ [SAVED_STORAGE_KEY]: '{broken' });
    expect(loadSavedState(corrupt)).toEqual({ version: 2, saved: [], compare: [] });
    const old = memoryStorage({
      [SAVED_STORAGE_KEY]: JSON.stringify({ version: 1, saved: ['legacy'], compare: [] }),
    });
    expect(loadSavedState(old)).toEqual({ version: 2, saved: [], compare: [] });
  });

  it('renders a truthful saved and compare view', () => {
    const html = renderSavedPage(
      [
        { id: 'one', title: 'One', subtitle: 'A', region: 'Europe', mode: 'rail', duration: '5 days', hero: {} },
        { id: 'two', title: 'Two', subtitle: 'B', region: 'Asia', mode: 'air', duration: '7 days', hero: {} },
      ],
      { saved: ['one', 'two'], compare: ['one', 'two'], agnesHistory: [] },
    );
    expect(html).toContain('Saved journeys');
    expect(html).toContain('Compare');
    expect(html).toContain('One');
    expect(html).toContain('Two');
  });
});
