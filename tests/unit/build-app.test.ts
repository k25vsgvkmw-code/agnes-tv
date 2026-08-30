import { expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';

it('builds the core application with AI unavailable', async () => {
  const app = await buildApp({
    databaseUrl: process.env.DATABASE_URL!,
    modelGateway: new UnavailableModelGateway(),
  });

  expect(app.modelGateway).toBeInstanceOf(UnavailableModelGateway);
  expect(app.connectorRegistry.get('test-calendar')).toBeDefined();

  await app.close();
});
