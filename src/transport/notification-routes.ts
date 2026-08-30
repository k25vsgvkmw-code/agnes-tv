import type { FastifyInstance } from 'fastify';

export interface NotificationRouteDependencies {
  readonly acknowledge: (id: string) => Promise<{ readonly id: string; readonly state: string }>;
}

export async function registerNotificationRoutes(
  app: FastifyInstance,
  dependencies: NotificationRouteDependencies,
): Promise<void> {
  app.post<{ Params: { id: string } }>('/notifications/:id/acknowledge', async (request) => {
    return dependencies.acknowledge(request.params.id);
  });
}
