import type { LearnerId } from './types.js';

export interface ResumeState {
  readonly learnerId: LearnerId;
  readonly resourceId: string;
  readonly pageId: string;
  readonly activityId: string | null;
  readonly updatedAt: string;
}
