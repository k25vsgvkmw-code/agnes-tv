import type { FastifyInstance } from 'fastify';
import {
  createFallbackFamilyOsSnapshot,
  type FamilyOsSnapshot,
} from '../presentation/web/family-os-snapshot.js';
import { renderFamilyOs } from '../presentation/web/render-family-os.js';

export interface AgnesWebRouteOptions {
  readonly snapshotFactory?: () => FamilyOsSnapshot;
}

export function registerAgnesWebRoutes(
  app: FastifyInstance,
  options: AgnesWebRouteOptions = {},
): Promise<void> {
  const snapshotFactory = options.snapshotFactory ?? createFallbackFamilyOsSnapshot;

  app.get('/', (_request, reply) => {
    const snapshot = snapshotFactory();
    return reply.type('text/html; charset=utf-8').send(renderFamilyOs(snapshot));
  });

  app.get('/ui/snapshot', () => snapshotFactory());

  return Promise.resolve();
}
