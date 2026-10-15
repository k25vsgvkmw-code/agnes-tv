import type { ActivityCheckResult } from './activity-checker.js';
import type { LearnerId } from './types.js';

export interface LearnerProgress {
  readonly learnerId: LearnerId;
  readonly stars: number;
  readonly completedActivityIds: readonly string[];
}

export function createEmptyProgress(learnerId: LearnerId): LearnerProgress {
  return { learnerId, stars: 0, completedActivityIds: [] };
}

export function completeActivity(
  progress: LearnerProgress,
  activityId: string,
  result: ActivityCheckResult,
): LearnerProgress {
  if (result.status !== 'correct' || progress.completedActivityIds.includes(activityId)) {
    return progress;
  }

  return {
    ...progress,
    stars: progress.stars + 1,
    completedActivityIds: [...progress.completedActivityIds, activityId],
  };
}
