import { describe, expect, it } from 'vitest';
import { rankDestinations } from '../docs/travel/ranking.js';

const sample = [
  {
    name: 'Venice',
    access: 'direct',
    baseScore: 95,
    tripTypes: ['City', 'Couple'],
    liveFareEur: 111,
  },
  {
    name: 'Innsbruck',
    access: '1_stop',
    baseScore: 96,
    tripTypes: ['Ski', 'Alps'],
    liveFareEur: null,
  },
  {
    name: 'Athens',
    access: 'direct',
    baseScore: 97,
    tripTypes: ['City', 'Family'],
    liveFareEur: null,
  },
];

describe('travel destination ranking', () => {
  it('removes one-stop destinations when directOnly is enabled', () => {
    const ranked = rankDestinations(sample, { directOnly: true });
    expect(ranked.some((destination) => destination.access !== 'direct')).toBe(false);
  });

  it('lifts destinations matching the selected trip type', () => {
    const ranked = rankDestinations(sample, { tripType: 'Ski' });
    expect(ranked[0].name).toBe('Innsbruck');
  });

  it('rewards fares within budget and ranks Venice first', () => {
    const ranked = rankDestinations(sample, { maxFare: 150 });
    expect(ranked[0].name).toBe('Venice');
    expect(ranked[0].score).toBeGreaterThan(100);
  });
});
