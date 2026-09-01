import { AgnesError, NotFoundError, ValidationError } from '../kernel/errors.js';
import { checkActivity, type ActivityCheckResult } from './activity-checker.js';
import {
  evaluateBreak,
  type BreakEvaluation,
  type BreakPolicy,
  type BreakSessionInput,
} from './break-coach.js';
import type { CurriculumPage, CurriculumResource } from './curriculum.js';
import type { EducationRepository } from './education-repository.js';
import type { PageInteractionState } from './interaction.js';
import { getLearnerProfile } from './learner-profile.js';
import type { ResumeState } from './lesson-session.js';
import { completeActivity } from './progress.js';
import { getCatalogForGrade, seedCatalog } from './seed-catalog.js';
import type { LearnerProfile } from './types.js';

export class EducationGradeMismatchError extends AgnesError {
  constructor() {
    super('EDUCATION_GRADE_MISMATCH', 'Grade mismatch');
  }
}

export const defaultBreakPolicy: BreakPolicy = {
  minutesThreshold: 20,
  activityThreshold: 3,
  breakMinutes: 5,
};

export class EducationService {
  constructor(
    private readonly repository: EducationRepository,
    private readonly breakPolicy: BreakPolicy = defaultBreakPolicy,
  ) {}

  getLearner(learnerId: string): LearnerProfile {
    try {
      return getLearnerProfile(learnerId);
    } catch {
      throw new NotFoundError(`Unknown learner: ${learnerId}`);
    }
  }

  getCatalog(learnerId: string): readonly CurriculumResource[] {
    const learner = this.getLearner(learnerId);
    return getCatalogForGrade(learner.grade);
  }

  async getPage(
    learnerId: string,
    resourceId: string,
    pageId: string,
  ): Promise<CurriculumPage> {
    const learner = this.getLearner(learnerId);
    const resource = seedCatalog.find((candidate) => candidate.resourceId === resourceId);
    if (!resource) {
      throw new NotFoundError(`Unknown education resource: ${resourceId}`);
    }
    if (resource.grade !== learner.grade) {
      throw new EducationGradeMismatchError();
    }

    const page = resource.pages.find((candidate) => candidate.pageId === pageId);
    if (!page) {
      throw new NotFoundError(`Unknown education page: ${pageId}`);
    }
    return page;
  }

  getResume(learnerId: string): Promise<ResumeState | null> {
    const learner = this.getLearner(learnerId);
    return this.repository.getResumeState(learner.learnerId);
  }

  async savePageState(
    learnerId: string,
    pageId: string,
    state: PageInteractionState,
    expectedVersion: number,
  ): Promise<PageInteractionState> {
    const learner = this.getLearner(learnerId);
    if (state.learnerId !== learner.learnerId || state.pageId !== pageId) {
      throw new ValidationError('Learner or page state does not match request');
    }

    const resource = seedCatalog.find((candidate) =>
      candidate.pages.some((page) => page.pageId === pageId),
    );
    if (!resource) {
      throw new NotFoundError(`Unknown education page: ${pageId}`);
    }
    if (resource.grade !== learner.grade) {
      throw new EducationGradeMismatchError();
    }

    const saved = await this.repository.savePageState(state, expectedVersion);
    await this.repository.saveResumeState({
      learnerId: learner.learnerId,
      resourceId: resource.resourceId,
      pageId,
      activityId: saved.state.currentActivityId,
      updatedAt: saved.state.updatedAt,
    });
    return saved.state;
  }

  async checkActivity(
    learnerId: string,
    activityId: string,
    answer: unknown,
  ): Promise<ActivityCheckResult> {
    const learner = this.getLearner(learnerId);
    const activity = getCatalogForGrade(learner.grade)
      .flatMap((resource) => resource.pages)
      .flatMap((page) => page.activities)
      .find((candidate) => candidate.activityId === activityId);
    if (!activity) {
      throw new NotFoundError(`Unknown education activity: ${activityId}`);
    }

    const result = checkActivity(activity, answer);
    const progress = await this.repository.getProgress(learner.learnerId);
    const updated = completeActivity(progress, activityId, result);
    if (updated !== progress) {
      await this.repository.saveProgress(learner.learnerId, updated);
    }
    return result;
  }

  evaluateBreak(learnerId: string, input: BreakSessionInput): BreakEvaluation {
    this.getLearner(learnerId);
    return evaluateBreak(input, this.breakPolicy);
  }
}
