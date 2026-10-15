import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { createHttpApp } from '../../src/app/create-http-app.js';
import { createEmptyPageState } from '../../src/education/interaction.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';

describe('education backend vertical slice', () => {
  it('runs Vasilis Γ΄ from catalog through autosave, validation, resume, and puppy break', async () => {
    const services = await buildApp({
      databaseUrl:
        process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agnes_test',
      modelGateway: new UnavailableModelGateway(),
    });
    const app = await createHttpApp(services, { logger: false });

    const profile = await app.inject({ method: 'GET', url: '/education/learners/vasilis' });
    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({ learnerId: 'vasilis', grade: 'C' });

    const catalog = await app.inject({
      method: 'GET',
      url: '/education/learners/vasilis/catalog',
    });
    expect(catalog.statusCode).toBe(200);
    const resources = catalog.json<Array<{ resourceId: string; grade: string }>>();
    expect(resources.every((resource) => resource.grade === 'C')).toBe(true);
    expect(resources.some((resource) => resource.resourceId === 'math-c-01')).toBe(true);

    const page = await app.inject({
      method: 'GET',
      url: '/education/learners/vasilis/resources/math-c-01/pages/math-c-01-p1',
    });
    expect(page.statusCode).toBe(200);
    expect(page.json()).toMatchObject({ pageId: 'math-c-01-p1' });

    const state = {
      ...createEmptyPageState('vasilis', 'math-c-01-p1'),
      numericAnswers: { 'math-c-01-a1': 37 },
      currentActivityId: 'math-c-01-a1',
      activityInProgress: true,
    };
    const save = await app.inject({
      method: 'PUT',
      url: '/education/learners/vasilis/pages/math-c-01-p1/state',
      payload: { expectedVersion: 0, state },
    });
    expect(save.statusCode).toBe(200);
    expect(save.json()).toMatchObject({ version: 1 });

    const check = await app.inject({
      method: 'POST',
      url: '/education/learners/vasilis/activities/math-c-01-a1/check',
      payload: { answer: 37 },
    });
    expect(check.statusCode).toBe(200);
    expect(check.json()).toEqual({ status: 'correct' });

    const resume = await app.inject({
      method: 'GET',
      url: '/education/learners/vasilis/resume',
    });
    expect(resume.statusCode).toBe(200);
    expect(resume.json()).toMatchObject({
      resourceId: 'math-c-01',
      pageId: 'math-c-01-p1',
      activityId: 'math-c-01-a1',
    });

    const deferredBreak = await app.inject({
      method: 'POST',
      url: '/education/learners/vasilis/break/evaluate',
      payload: {
        uninterruptedMinutes: 25,
        completedActivities: 4,
        activityInProgress: true,
      },
    });
    expect(deferredBreak.statusCode).toBe(200);
    expect(deferredBreak.json()).toEqual({ action: 'defer' });

    const suggestedBreak = await app.inject({
      method: 'POST',
      url: '/education/learners/vasilis/break/evaluate',
      payload: {
        uninterruptedMinutes: 25,
        completedActivities: 4,
        activityInProgress: false,
      },
    });
    expect(suggestedBreak.statusCode).toBe(200);
    expect(suggestedBreak.json()).toMatchObject({ action: 'suggest', breakMinutes: 5 });

    await app.close();
  });

  it('keeps Γ΄ content unavailable to Elenios Α΄', async () => {
    const services = await buildApp({
      databaseUrl:
        process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agnes_test',
      modelGateway: new UnavailableModelGateway(),
    });
    const app = await createHttpApp(services, { logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/education/learners/elenios/resources/math-c-01/pages/math-c-01-p1',
    });
    expect(response.statusCode).toBe(403);

    await app.close();
  });
});
