import { createHash, randomUUID } from 'node:crypto';
import type { Clock } from '../kernel/clock.js';
import { ValidationError } from '../kernel/errors.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';
import type { HealthConfig } from './health-config.js';
import {
  healthRules,
  type HealthMeasurement,
  type HealthProvider,
  type RawHealthMeasurement,
} from './health-measurement.js';

export interface HealthNormalizationContext {
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly provider: HealthProvider;
  readonly sourceDeviceId: string;
  readonly clock: Clock;
  readonly config: HealthConfig;
}

function sha256(material: string): string {
  return createHash('sha256').update(material).digest('hex');
}

function validateMeasurement(input: RawHealthMeasurement): void {
  const rule = healthRules[input.kind];
  if (rule === undefined) {
    throw new ValidationError(`unsupported health kind: ${String(input.kind)}`);
  }

  if (input.unit !== rule.unit) {
    throw new ValidationError(`${input.kind} requires ${rule.unit}`);
  }

  if (!Number.isFinite(input.value) || input.value < rule.min || input.value > rule.max) {
    throw new ValidationError(`${input.kind} value is outside the allowed range`);
  }

  if (rule.integer && !Number.isInteger(input.value)) {
    throw new ValidationError(`${input.kind} value must be an integer`);
  }
}

function parseMeasuredAt(measuredAt: string, receivedAt: Date, config: HealthConfig): Date {
  const parsed = new Date(measuredAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('measurement timestamp is invalid');
  }

  if (parsed.getTime() > receivedAt.getTime() + config.maxFutureSkewMs) {
    throw new ValidationError('measurement timestamp is too far in the future');
  }

  if (parsed.getTime() < receivedAt.getTime() - config.maxImportAgeMs) {
    throw new ValidationError('measurement timestamp is too old');
  }

  return parsed;
}

function dedupeMaterial(
  input: RawHealthMeasurement,
  context: HealthNormalizationContext,
  measuredAt: Date,
): string {
  if (input.externalId !== undefined) {
    return `${context.provider}|${context.sourceDeviceId}|${input.externalId}`;
  }

  return [
    context.householdId,
    context.personId,
    input.kind,
    measuredAt.toISOString(),
    String(input.value),
    input.unit,
    context.provider,
    context.sourceDeviceId,
  ].join('|');
}

export function normalizeHealthMeasurement(
  input: RawHealthMeasurement,
  context: HealthNormalizationContext,
): HealthMeasurement {
  validateMeasurement(input);

  const receivedAt = context.clock.now();
  const measuredAt = parseMeasuredAt(input.measuredAt, receivedAt, context.config);
  const dedupeKey = sha256(dedupeMaterial(input, context, measuredAt));

  return {
    id: randomUUID(),
    householdId: context.householdId,
    personId: context.personId,
    kind: input.kind,
    value: input.value,
    unit: input.unit,
    measuredAt,
    sourceProvider: context.provider,
    sourceDeviceId: context.sourceDeviceId,
    dedupeKey,
    receivedAt,
    metadata: input.metadata ?? {},
    ...(input.externalId === undefined ? {} : { externalId: input.externalId }),
  };
}
