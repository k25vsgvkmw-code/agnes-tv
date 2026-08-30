import { AgnesError } from '../kernel/errors.js';
import type { WeatherPort, WeatherQuery } from './weather-port.js';
import { createWeatherSnapshot, type WeatherSnapshot } from './weather-snapshot.js';

interface OpenMeteoPayload {
  readonly current?: {
    readonly time?: unknown;
    readonly temperature_2m?: unknown;
    readonly apparent_temperature?: unknown;
    readonly relative_humidity_2m?: unknown;
    readonly precipitation?: unknown;
    readonly weather_code?: unknown;
    readonly wind_speed_10m?: unknown;
    readonly wind_gusts_10m?: unknown;
  };
  readonly hourly?: {
    readonly time?: unknown;
    readonly precipitation_probability?: unknown;
    readonly visibility?: unknown;
    readonly uv_index?: unknown;
  };
}

function providerError(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): AgnesError {
  return new AgnesError('WEATHER_PROVIDER_ERROR', message, details);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw providerError(`Malformed Open-Meteo field: ${field}`, { field });
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw providerError(`Malformed Open-Meteo field: ${field}`, { field });
  }
  return value;
}

function numberArray(value: unknown, field: string): readonly number[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'number')
  ) {
    throw providerError(`Malformed Open-Meteo field: ${field}`, { field });
  }
  return value as readonly number[];
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string')
  ) {
    throw providerError(`Malformed Open-Meteo field: ${field}`, { field });
  }
  return value as readonly string[];
}

function conditionFromCode(code: number): string {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
    return 'snow';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'unknown';
}

function hourlyIndex(times: readonly string[], observedAt: string): number {
  const exact = times.indexOf(observedAt);
  if (exact >= 0) return exact;
  return 0;
}

export class OpenMeteoWeatherAdapter implements WeatherPort {
  constructor(private readonly baseUrl: string) {}

  async getCurrent(query: WeatherQuery): Promise<WeatherSnapshot> {
    const url = new URL('/v1/forecast', this.baseUrl);
    url.searchParams.set('latitude', String(query.point.latitude));
    url.searchParams.set('longitude', String(query.point.longitude));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'wind_gusts_10m',
      ].join(','),
    );
    url.searchParams.set(
      'hourly',
      'precipitation_probability,visibility,uv_index',
    );

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw providerError('Open-Meteo request failed', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      throw providerError('Open-Meteo returned a non-success response', {
        status: response.status,
      });
    }

    let payload: OpenMeteoPayload;
    try {
      payload = (await response.json()) as OpenMeteoPayload;
    } catch {
      throw providerError('Open-Meteo returned invalid JSON');
    }

    const current = payload.current;
    const hourly = payload.hourly;
    if (current === undefined || hourly === undefined) {
      throw providerError(
        'Open-Meteo response is missing current or hourly weather',
      );
    }

    const observedText = requiredString(current.time, 'current.time');
    const observedAt = new Date(observedText);
    if (Number.isNaN(observedAt.getTime())) {
      throw providerError('Malformed Open-Meteo field: current.time', {
        field: 'current.time',
      });
    }

    const times = stringArray(hourly.time, 'hourly.time');
    const index = hourlyIndex(times, observedText);
    const rainProbabilities = numberArray(
      hourly.precipitation_probability,
      'hourly.precipitation_probability',
    );
    const visibility = numberArray(hourly.visibility, 'hourly.visibility');
    const uvIndex = numberArray(hourly.uv_index, 'hourly.uv_index');
    const rainProbability = requiredNumber(
      rainProbabilities[index],
      'hourly.precipitation_probability',
    );
    const visibilityMeters = requiredNumber(
      visibility[index],
      'hourly.visibility',
    );
    const uv = requiredNumber(uvIndex[index], 'hourly.uv_index');

    return createWeatherSnapshot({
      householdId: query.householdId,
      placeId: query.placeId,
      observedAt,
      expiresAt: new Date(observedAt.getTime() + 20 * 60 * 1000),
      temperatureC: requiredNumber(
        current.temperature_2m,
        'current.temperature_2m',
      ),
      feelsLikeC: requiredNumber(
        current.apparent_temperature,
        'current.apparent_temperature',
      ),
      condition: conditionFromCode(
        requiredNumber(current.weather_code, 'current.weather_code'),
      ),
      rainProbability: rainProbability / 100,
      precipitationMm: requiredNumber(
        current.precipitation,
        'current.precipitation',
      ),
      windSpeedKmh: requiredNumber(
        current.wind_speed_10m,
        'current.wind_speed_10m',
      ),
      windGustKmh: requiredNumber(
        current.wind_gusts_10m,
        'current.wind_gusts_10m',
      ),
      humidity: requiredNumber(
        current.relative_humidity_2m,
        'current.relative_humidity_2m',
      ),
      visibilityKm: visibilityMeters / 1000,
      uvIndex: uv,
      source: 'open-meteo',
      confidence: 0.9,
    });
  }
}
