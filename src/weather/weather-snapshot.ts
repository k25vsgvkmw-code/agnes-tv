import { ValidationError } from '../kernel/errors.js';
import type { HouseholdId } from '../kernel/ids.js';

export interface WeatherSnapshotInput {
  readonly householdId: HouseholdId;
  readonly placeId: string;
  readonly observedAt: Date;
  readonly expiresAt: Date;
  readonly temperatureC: number;
  readonly feelsLikeC: number;
  readonly condition: string;
  readonly rainProbability: number;
  readonly precipitationMm: number;
  readonly windSpeedKmh: number;
  readonly windGustKmh: number;
  readonly humidity: number;
  readonly visibilityKm: number;
  readonly uvIndex: number;
  readonly source: string;
  readonly confidence: number;
}

export type WeatherSnapshot = Readonly<WeatherSnapshotInput>;

function assertProbability(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new ValidationError(`${name} must be between 0 and 1`, { field: name, value });
  }
}

export function createWeatherSnapshot(input: WeatherSnapshotInput): WeatherSnapshot {
  assertProbability('rainProbability', input.rainProbability);
  assertProbability('confidence', input.confidence);

  if (input.expiresAt.getTime() <= input.observedAt.getTime()) {
    throw new ValidationError('expiresAt must be after observedAt', {
      field: 'expiresAt',
      observedAt: input.observedAt.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
    });
  }

  return Object.freeze({
    ...input,
    observedAt: new Date(input.observedAt.getTime()),
    expiresAt: new Date(input.expiresAt.getTime()),
  });
}
