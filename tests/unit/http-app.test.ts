import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { createHttpApp } from '../../src/app/create-http-app.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';

describe('HTTP app', () => {
  it('registers health and education routes from composed services', async () => {
    const services = await buildApp({
      databaseUrl:
        process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agnes_test',
      modelGateway: new UnavailableModelGateway(),
    });
    const app = await createHttpApp(services, { logger: false });

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);

    const learner = await app.inject({ method: 'GET', url: '/education/learners/vasilis' });
    expect(learner.statusCode).toBe(200);
    expect(learner.json()).toMatchObject({ learnerId: 'vasilis', grade: 'C' });

    await app.close();
  });
});
