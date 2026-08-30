import { createHash } from 'node:crypto';
import type { HouseholdId } from '../kernel/ids.js';
import type { SituationEntityReference, SituationType } from './situation.js';

export interface SituationTimeWindow {
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export interface SituationFingerprintInput {
  readonly householdId: HouseholdId;
  readonly type: SituationType;
  readonly relatedEntities: readonly SituationEntityReference[];
  readonly timeWindow: SituationTimeWindow;
}

export function createSituationFingerprint(input: SituationFingerprintInput): string {
  const relatedEntities = input.relatedEntities
    .map((entity) => `${entity.type}:${entity.id}`)
    .sort()
    .join(',');
  const timeWindowKey = `${input.timeWindow.startsAt.toISOString()}/${input.timeWindow.endsAt.toISOString()}`;
  const canonical = [input.householdId, input.type, relatedEntities, timeWindowKey].join('|');

  return createHash('sha256').update(canonical).digest('hex');
}
