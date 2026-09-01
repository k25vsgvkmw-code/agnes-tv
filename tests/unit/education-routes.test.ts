import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import {
  EducationVersionConflictError,
  type EducationRepository,
  type SavePageStateResult,
} from '../../src/education/education-repository.js';
import { EducationService } from '../../src/education/education-service.js';
import { createEmptyPageState, type PageInteractionState } from '../../src/education/interaction.js';
import type { ResumeState } from '../../src/education/lesson-session.js';
import { createEmptyProgress, type LearnerProgress } from '../../src/education/progress.js';
import type { LearnerId } from '../../src/education/types.js';
import { registerEducationRoutes } from '../../src/transport/education-routes.js';

class RouteEducationRepository implements EducationRepository {
  readonly pages = new Map<string, PageInteractionState>();
  readonly resumes = new Map<LearnerId, ResumeState>();
  readonly progresses = new Map<LearnerId, LearnerProgress>();

  getPageState(learnerId: LearnerId, pageId: string): Promise<PageInteractionState | null> {
    return Promise.resolve(this.pages.get(`${learnerId}:${pageId}`) ?? null);
  }

  savePageState(
    state: PageInteractionState,
    expectedVersion: number,
  ): Promise<SavePageStateResult> {
    const existing = this.pages.get(`${state.learnerId}:${state.pageId}`);
    if (existing && existing.version !== expectedVersion) {
      return Promise.reject(new EducationVersionConflictError());
    }
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
    return Promise.resolve(this.progresses.get(learnerId) ?? createEmptyProgress(learnerId));
  }

  saveProgress(learnerId: LearnerId, progress: LearnerProgress): Promise<void> {
    this.progresses.set(learnerId, progress);
    return Promise.resolve();
  }
}

async function createTestApp(repository = new RouteEducationRepository()) {
  const app = Fastify();
  await registerEducationRoutes(app, new EducationService(repository));
  return { app, repository };
}

describe('education routes', () => {
  it('returns Vasilis as grade C and Elenios catalog as grade A', async () => {
    const { app } = await createTestApp();

    const profile = await app.inject({ method: 'GET', url: '/education/learners/vasilis' });
    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({ learnerId: 'vasilis', grade: 'C' });

    const catalog = await app.inject({
      method: 'GET',
      url: '/education/learners/elenios/catalog',
    });
    expect(catalog.statusCode).toBe(200);
    expect((catalog.json() as Array<{ grade: string }>).every((item) => item.grade === 'A')).toBe(
      true,
    );

    await app.close();
  });

  it('blocks Elenios from a grade C page', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/education/learners/elenios/resources/math-c-01/pages/math-c-01-p1',
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it('autosaves page state and returns 409 for a stale version', async () => {
    const { app } = await createTestApp();
    const state = createEmptyPageState('vasilis', 'math-c-01-p1');

    const first = await app.inject({
      method: 'PUT',
      url: '/education/learners/vasilis/pages/math-c-01-p1/state',
      payload: { expectedVersion: 0, state },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ version: 1 });

    const stale = await app.inject({
      method: 'PUT',
      url: '/education/learners/vasilis/pages/math-c-01-p1/state',
      payload: { expectedVersion: 0, state },
    });
    expect(stale.statusCode).toBe(409);

    await app.close();
  });

  it('validates autosave payloads', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/education/learners/vasilis/pages/math-c-01-p1/state',
      payload: { expectedVersion: -1, state: {} },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('checks answers and evaluates the puppy break coach', async () => {
    const { app } = await createTestApp();

    const check = await app.inject({
      method: 'POST',
      url: '/education/learners/vasilis/activities/math-c-01-a1/check',
      payload: { answer: 37 },
    });
    expect(check.statusCode).toBe(200);
    expect(check.json()).toEqual({ status: 'correct' });

    const breakResponse = await app.inject({
      method: 'POST',
      url: '/education/learners/vasilis/break/evaluate',
      payload: { uninterruptedMinutes: 25, completedActivities: 4, activityInProgress: true },
    });
    expect(breakResponse.statusCode).toBe(200);
    expect(breakResponse.json()).toEqual({ action: 'defer' });

    await app.close();
  });
});
