import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', () => ({ status: 'ok' as const }));
  return Promise.resolve();
}
