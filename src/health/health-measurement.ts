import type { HouseholdId, PersonId } from '../kernel/ids.js';

export type HealthProvider = 'healthkit' | 'health_connect';
export type HealthKind = 'steps' | 'heart_rate' | 'sleep' | 'weight' | 'active_energy';
export type HealthUnit = 'count' | 'bpm' | 'minutes' | 'kg' | 'kcal';

export interface RawHealthMeasurement {
  readonly kind: HealthKind;
  readonly value: number;
  readonly unit: HealthUnit;
  readonly measuredAt: string;
  readonly externalId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface HealthMeasurement {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly kind: HealthKind;
  readonly value: number;
  readonly unit: HealthUnit;
  readonly measuredAt: Date;
  readonly sourceProvider: HealthProvider;
  readonly sourceDeviceId: string;
  readonly externalId?: string;
  readonly dedupeKey: string;
  readonly receivedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface HealthRule {
  readonly unit: HealthUnit;
  readonly min: number;
  readonly max: number;
  readonly integer: boolean;
}

export const healthRules: Readonly<Record<HealthKind, HealthRule>> = {
  steps: { unit: 'count', min: 0, max: 200_000, integer: true },
  heart_rate: { unit: 'bpm', min: 20, max: 250, integer: false },
  sleep: { unit: 'minutes', min: 0, max: 1_440, integer: false },
  weight: { unit: 'kg', min: 1, max: 500, integer: false },
  active_energy: { unit: 'kcal', min: 0, max: 20_000, integer: false },
};
