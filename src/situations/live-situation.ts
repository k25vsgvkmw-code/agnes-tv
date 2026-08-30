import type { HouseholdId, SituationId } from '../kernel/ids.js';
import type {
  SituationEntityReference,
  SituationSupportingFactor,
  SituationType,
} from './situation.js';

export type LiveSituationState = 'DETECTED' | 'ACTIVE' | 'UPDATED' | 'RESOLVED' | 'EXPIRED';

export interface LiveSituation {
  readonly id: SituationId;
  readonly householdId: HouseholdId;
  readonly fingerprint: string;
  readonly type: SituationType;
  readonly state: LiveSituationState;
  readonly confidence: number;
  readonly relatedEntities: readonly SituationEntityReference[];
  readonly supportingFactors: readonly SituationSupportingFactor[];
  readonly detectedAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date;
  readonly correlationId?: string;
}
