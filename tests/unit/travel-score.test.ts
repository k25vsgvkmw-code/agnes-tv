import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRAVEL_SCORE_WEIGHTS,
  scoreTravel,
} from '../../src/travel/scoring/travel-score.js';

describe('AGNES Travel Score', () => {
  it('uses the approved weights and keeps them normalized', () => {
    const total = Object.values(DEFAULT_TRAVEL_SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(DEFAULT_TRAVEL_SCORE_WEIGHTS).toEqual({
      flightValue: 0.22,
      accommodationValue: 0.16,
      seasonSuitability: 0.18,
      weatherSuitability: 0.12,
      directness: 0.1,
      travelTime: 0.08,
      tripLengthFit: 0.06,
      experienceRelevance: 0.04,
      crowdPressure: 0.04,
    });
  });

  it('prevents a cheap badly timed trip from becoming top tier', () => {
    const result = scoreTravel({
      flightValue: 100,
      accommodationValue: 98,
      seasonSuitability: 25,
      weatherSuitability: 40,
      directness: 100,
      travelTime: 92,
      tripLengthFit: 100,
      experienceRelevance: 80,
      crowdPressure: 90,
    });

    expect(result.total).toBeLessThan(80);
  });

  it('can rank a genuinely strong all-round opportunity above 90', () => {
    const result = scoreTravel({
      flightValue: 94,
      accommodationValue: 92,
      seasonSuitability: 97,
      weatherSuitability: 94,
      directness: 100,
      travelTime: 93,
      tripLengthFit: 100,
      experienceRelevance: 92,
      crowdPressure: 86,
    });

    expect(result.total).toBeGreaterThanOrEqual(93);
    expect(result.confidence).toBe(1);
  });

  it('reduces confidence when a provider factor is unavailable without inventing a value', () => {
    const result = scoreTravel({
      flightValue: 90,
      seasonSuitability: 95,
      weatherSuitability: 90,
      directness: 100,
      travelTime: 90,
      tripLengthFit: 100,
      experienceRelevance: 85,
      crowdPressure: 80,
    });

    expect(result.breakdown.accommodationValue).toBeNull();
    expect(result.confidence).toBeLessThan(1);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it('clamps out-of-range inputs rather than allowing score overflow', () => {
    const result = scoreTravel({
      flightValue: 140,
      accommodationValue: 130,
      seasonSuitability: 120,
      weatherSuitability: 110,
      directness: 100,
      travelTime: 100,
      tripLengthFit: 100,
      experienceRelevance: 100,
      crowdPressure: 100,
    });

    expect(result.total).toBe(100);
  });
});
