import { afterEach, describe, expect, it, vi } from 'vitest';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { OpenMeteoWeatherAdapter } from '../../src/weather/open-meteo-weather-adapter.js';

function query() {
  return {
    householdId: newHouseholdId(),
    placeId: 'home',
    point: { latitude: 34.92, longitude: 33.63 },
    now: new Date('2026-09-01T15:00:00Z'),
  } as const;
}

function providerPayload() {
  return {
    current: {
      time: '2026-09-01T15:00:00Z',
      temperature_2m: 29,
      apparent_temperature: 31,
      relative_humidity_2m: 70,
      precipitation: 1.2,
      weather_code: 61,
      wind_speed_10m: 18,
      wind_gusts_10m: 27,
    },
    hourly: {
      time: ['2026-09-01T15:00:00Z'],
      precipitation_probability: [80],
      visibility: [10000],
      uv_index: [2],
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenMeteoWeatherAdapter', () => {
  it('requests required fields and normalizes provider weather into canonical units', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(providerPayload()), { status: 200 }));
    const adapter = new OpenMeteoWeatherAdapter('https://api.open-meteo.com');

    const result = await adapter.getCurrent(query());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain('/v1/forecast?');
    expect(requestedUrl).toContain('timezone=auto');
    expect(requestedUrl).toContain('temperature_2m');
    expect(requestedUrl).toContain('apparent_temperature');
    expect(requestedUrl).toContain('precipitation_probability');
    expect(requestedUrl).toContain('visibility');
    expect(requestedUrl).toContain('uv_index');
    expect(result.condition).toBe('rain');
    expect(result.rainProbability).toBe(0.8);
    expect(result.visibilityKm).toBe(10);
    expect(result.observedAt.toISOString()).toBe('2026-09-01T15:00:00.000Z');
    expect(result.expiresAt.toISOString()).toBe('2026-09-01T15:20:00.000Z');
    expect(result.source).toBe('open-meteo');
  });

  it('throws WEATHER_PROVIDER_ERROR for non-success responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('unavailable', { status: 503 }));
    const adapter = new OpenMeteoWeatherAdapter('https://api.open-meteo.com');

    await expect(adapter.getCurrent(query())).rejects.toMatchObject({
      code: 'WEATHER_PROVIDER_ERROR',
    });
  });

  it('throws WEATHER_PROVIDER_ERROR for malformed required fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ current: { temperature_2m: 29 } }), { status: 200 }),
    );
    const adapter = new OpenMeteoWeatherAdapter('https://api.open-meteo.com');

    await expect(adapter.getCurrent(query())).rejects.toMatchObject({
      code: 'WEATHER_PROVIDER_ERROR',
    });
  });
});
