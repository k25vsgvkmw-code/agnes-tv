import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';

describe('buildApp', () => {
  it('composes the model gateway, connector registry, and education services', async () => {
    const modelGateway = new UnavailableModelGateway();
    const app = await buildApp({
      databaseUrl:
        process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agnes_test',
      modelGateway,
    });

    expect(app.modelGateway).toBe(modelGateway);
    expect(app.connectorRegistry.get('test-calendar')).toBeDefined();
    expect(app.educationRepository).toBeDefined();
    expect(app.educationService.getLearner('vasilis').grade).toBe('C');
    await app.close();
  });
});
