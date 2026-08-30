import Fastify, { type FastifyInstance } from 'fastify';
import { UnavailableModelGateway } from '../intelligence/unavailable-model-gateway.js';
import { registerHealthRoutes } from '../transport/health-routes.js';
import { buildApp } from './build-app.js';

export async function buildServer(): Promise<FastifyInstance> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL is required');
  }

  const core = await buildApp({
    databaseUrl,
    modelGateway: new UnavailableModelGateway(),
  });
  const app = Fastify();

  app.addHook('onClose', async () => {
    await core.close();
  });

  await registerHealthRoutes(app);
  return app;
}
