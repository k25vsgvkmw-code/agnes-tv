import { ValidationError } from '../kernel/errors.js';

export interface TravelConditionInput {
  readonly observedAt: Date;
  readonly expiresAt: Date;
  readonly durationMinutes: number;
  readonly distanceKm: number;
  readonly trafficDelayMinutes: number;
  readonly source: string;
  readonly confidence: number;
}

export type TravelCondition = Readonly<TravelConditionInput>;

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${name} must be a non-negative finite number`, {
      field: name,
      value,
    });
  }
}

function assertProbability(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new ValidationError(`${name} must be between 0 and 1`, { field: name, value });
  }
}

export function createTravelCondition(input: TravelConditionInput): TravelCondition {
  assertNonNegative('durationMinutes', input.durationMinutes);
  assertNonNegative('distanceKm', input.distanceKm);
  assertNonNegative('trafficDelayMinutes', input.trafficDelayMinutes);
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
