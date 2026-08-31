import { ValidationError } from '../kernel/errors.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

export type KidsWorldProfileStatus = 'active' | 'inactive';

export interface KidsWorldProfile {
  readonly personId: PersonId;
  readonly householdId: HouseholdId;
  readonly avatarKey: string;
  readonly companionKey: string;
  readonly themeKey: string;
  readonly xp: number;
  readonly starsBalance: number;
  readonly status: KidsWorldProfileStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateKidsWorldProfileInput {
  readonly personId: PersonId;
  readonly householdId: HouseholdId;
  readonly avatarKey: string;
  readonly companionKey?: string;
  readonly themeKey?: string;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`kidsworld profile ${field} is required`);
  }
  return normalized;
}

export function createKidsWorldProfile(input: CreateKidsWorldProfileInput): KidsWorldProfile {
  const now = new Date();
  return {
    personId: input.personId,
    householdId: input.householdId,
    avatarKey: requireText(input.avatarKey, 'avatarKey'),
    companionKey: requireText(input.companionKey ?? 'agnes-dino', 'companionKey'),
    themeKey: requireText(input.themeKey ?? 'kidsworld-default', 'themeKey'),
    xp: 0,
    starsBalance: 0,
    status: 'active',
    createdAt: now,
    updatedAt: new Date(now),
  };
}
