import Fastify, { type FastifyInstance } from 'fastify';
import { registerHealthRoutes } from '../transport/health-routes.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify();
  await registerHealthRoutes(app);
  return app;
}
