import { ValidationError } from '../kernel/errors.js';
import {
  newKidsWorldMissionId,
  type HouseholdId,
  type KidsWorldMissionId,
  type PersonId,
} from '../kernel/ids.js';

export type MissionType =
  | 'routine'
  | 'learning'
  | 'activity'
  | 'exploration'
  | 'story'
  | 'creative';
export type MissionStatus = 'available' | 'completed' | 'expired' | 'cancelled';
export type MissionSource = 'system' | 'calendar' | 'parent' | 'content';

export interface Mission {
  readonly id: KidsWorldMissionId;
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly type: MissionType;
  readonly title: string;
  readonly description: string | null;
  readonly scheduledFor: Date;
  readonly rewardStars: number;
  readonly status: MissionStatus;
  readonly source: MissionSource;
  readonly sourceReference: string | null;
  readonly completedAt: Date | null;
}

export interface CreateMissionInput {
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly type: MissionType;
  readonly title: string;
  readonly description?: string;
  readonly scheduledFor: Date;
  readonly rewardStars: number;
  readonly source: MissionSource;
  readonly sourceReference?: string;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`mission ${field} is required`);
  }
  return normalized;
}

export function createMission(input: CreateMissionInput): Mission {
  if (!Number.isInteger(input.rewardStars) || input.rewardStars <= 0) {
    throw new ValidationError('mission rewardStars must be a positive integer');
  }
  return {
    id: newKidsWorldMissionId(),
    householdId: input.householdId,
    personId: input.personId,
    type: input.type,
    title: requireText(input.title, 'title'),
    description: input.description?.trim() || null,
    scheduledFor: new Date(input.scheduledFor),
    rewardStars: input.rewardStars,
    status: 'available',
    source: input.source,
    sourceReference: input.sourceReference?.trim() || null,
    completedAt: null,
  };
}

export function completeMissionRecord(mission: Mission, completedAt: Date): Mission {
  if (mission.status === 'completed') {
    throw new ValidationError('mission already completed');
  }
  if (mission.status !== 'available') {
    throw new ValidationError('mission must be available to complete');
  }
  return {
    ...mission,
    status: 'completed',
    completedAt: new Date(completedAt),
  };
}
