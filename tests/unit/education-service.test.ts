import { describe, expect, it } from 'vitest';
import type {
  EducationRepository,
  SavePageStateResult,
} from '../../src/education/education-repository.js';
import {
  EducationGradeMismatchError,
  EducationService,
} from '../../src/education/education-service.js';
import {
  createEmptyPageState,
  type PageInteractionState,
} from '../../src/education/interaction.js';
import type { ResumeState } from '../../src/education/lesson-session.js';
import {
  createEmptyProgress,
  type LearnerProgress,
} from '../../src/education/progress.js';
import type { LearnerId } from '../../src/education/types.js';

class MemoryEducationRepository implements EducationRepository {
  readonly pages = new Map<string, PageInteractionState>();
  readonly resumes = new Map<LearnerId, ResumeState>();
  readonly progresses = new Map<LearnerId, LearnerProgress>();

  getPageState(
    learnerId: LearnerId,
    pageId: string,
  ): Promise<PageInteractionState | null> {
    return Promise.resolve(this.pages.get(`${learnerId}:${pageId}`) ?? null);
  }

  savePageState(
    state: PageInteractionState,
    expectedVersion: number,
  ): Promise<SavePageStateResult> {
    const saved = {
      ...state,
      version: expectedVersion + 1,
      updatedAt: '2026-09-01T10:00:00.000Z',
    };
    this.pages.set(`${state.learnerId}:${state.pageId}`, saved);
    return Promise.resolve({ state: saved });
  }

  getResumeState(learnerId: LearnerId): Promise<ResumeState | null> {
    return Promise.resolve(this.resumes.get(learnerId) ?? null);
  }

  saveResumeState(state: ResumeState): Promise<void> {
    this.resumes.set(state.learnerId, state);
    return Promise.resolve();
  }

  getProgress(learnerId: LearnerId): Promise<LearnerProgress> {
    return Promise.resolve(
      this.progresses.get(learnerId) ?? createEmptyProgress(learnerId),
    );
  }

  saveProgress(learnerId: LearnerId, progress: LearnerProgress): Promise<void> {
    this.progresses.set(learnerId, progress);
    return Promise.resolve();
  }
}

describe('education service', () => {
  it('keeps Γ΄ resources away from Elenios', () => {
    const service = new EducationService(new MemoryEducationRepository());

    expect(() => service.getPage('elenios', 'math-c-01', 'math-c-01-p1')).toThrow(
      EducationGradeMismatchError,
    );
  });

  it('saves page work and updates Vasilis resume state', async () => {
    const repository = new MemoryEducationRepository();
    const service = new EducationService(repository);
    const state = {
      ...createEmptyPageState('vasilis', 'math-c-01-p1'),
      currentActivityId: 'math-c-01-a1',
      typedAnswers: { 'math-c-01-a1': '37' },
    };

    const saved = await service.savePageState('vasilis', 'math-c-01-p1', state, 0);

    expect(saved.version).toBe(1);
    expect((await service.getResume('vasilis'))?.pageId).toBe('math-c-01-p1');
    expect((await service.getResume('vasilis'))?.activityId).toBe('math-c-01-a1');
  });

  it('checks a correct activity and awards one star', async () => {
    const repository = new MemoryEducationRepository();
    const service = new EducationService(repository);

    expect(await service.checkActivity('vasilis', 'math-c-01-a1', 37)).toEqual({
      status: 'correct',
    });
    expect((await repository.getProgress('vasilis')).stars).toBe(1);
  });

  it('defers the puppy break while an activity is active', () => {
    const service = new EducationService(new MemoryEducationRepository());

    expect(
      service.evaluateBreak('vasilis', {
        uninterruptedMinutes: 25,
        completedActivities: 4,
        activityInProgress: true,
      }),
    ).toEqual({ action: 'defer' });
  });
});
