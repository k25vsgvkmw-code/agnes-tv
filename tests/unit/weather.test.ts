import { describe, expect, it } from 'vitest';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { createWeatherSnapshot } from '../../src/weather/weather-snapshot.js';

function validWeatherInput() {
  return {
    householdId: newHouseholdId(),
    placeId: 'home',
    observedAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt: new Date('2026-09-01T15:20:00Z'),
    temperatureC: 29,
    feelsLikeC: 31,
    condition: 'rain',
    rainProbability: 0.8,
    precipitationMm: 1.2,
    windSpeedKmh: 18,
    windGustKmh: 27,
    humidity: 70,
    visibilityKm: 10,
    uvIndex: 2,
    source: 'fake-weather',
    confidence: 0.95,
  } as const;
}

describe('canonical weather snapshot', () => {
  it('creates a canonical snapshot with bounded probabilities', () => {
    const snapshot = createWeatherSnapshot(validWeatherInput());

    expect(snapshot.rainProbability).toBe(0.8);
    expect(snapshot.confidence).toBe(0.95);
    expect(snapshot.observedAt).toEqual(new Date('2026-09-01T15:00:00Z'));
    expect(snapshot.expiresAt).toEqual(new Date('2026-09-01T15:20:00Z'));
  });

  it('rejects rain probability outside zero to one', () => {
    expect(() => createWeatherSnapshot({ ...validWeatherInput(), rainProbability: 1.1 })).toThrow(
      'rainProbability',
    );
  });

  it('rejects confidence outside zero to one', () => {
    expect(() => createWeatherSnapshot({ ...validWeatherInput(), confidence: -0.1 })).toThrow(
      'confidence',
    );
  });

  it('rejects expiry at or before observation', () => {
    expect(() =>
      createWeatherSnapshot({
        ...validWeatherInput(),
        expiresAt: new Date('2026-09-01T15:00:00Z'),
      }),
    ).toThrow('expiresAt');
  });
});
