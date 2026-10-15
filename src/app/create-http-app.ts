import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerEducationRoutes } from '../transport/education-routes.js';
import { registerHealthRoutes } from '../transport/health-routes.js';
import type { AgnesApp } from './build-app.js';

export async function createHttpApp(
  services: AgnesApp,
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify(options);
  app.addHook('onClose', () => services.close());

  await registerHealthRoutes(app);
  await registerEducationRoutes(app, services.educationService);

  return app;
}
