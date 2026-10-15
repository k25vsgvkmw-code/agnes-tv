import type { PageInteractionState } from './interaction.js';
import type { ResumeState } from './lesson-session.js';
import type { LearnerProgress } from './progress.js';
import type { LearnerId } from './types.js';

export interface SavePageStateResult {
  readonly state: PageInteractionState;
}

export class EducationVersionConflictError extends Error {
  constructor() {
    super('Education page state version conflict');
    this.name = 'EducationVersionConflictError';
  }
}

export interface EducationRepository {
  getPageState(learnerId: LearnerId, pageId: string): Promise<PageInteractionState | null>;
  savePageState(state: PageInteractionState, expectedVersion: number): Promise<SavePageStateResult>;
  getResumeState(learnerId: LearnerId): Promise<ResumeState | null>;
  saveResumeState(state: ResumeState): Promise<void>;
  getProgress(learnerId: LearnerId): Promise<LearnerProgress>;
  saveProgress(learnerId: LearnerId, progress: LearnerProgress): Promise<void>;
}
