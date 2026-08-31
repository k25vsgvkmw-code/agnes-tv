import type { FastifyInstance } from 'fastify';

export type AcknowledgeNotificationHandler = (id: string) => Promise<void>;

export function registerNotificationRoutes(
  app: FastifyInstance,
  acknowledge: AcknowledgeNotificationHandler,
): Promise<void> {
  app.post<{ Params: { id: string } }>('/notifications/:id/acknowledge', async (request, reply) => {
    await acknowledge(request.params.id);
    return reply.code(204).send();
  });
  return Promise.resolve();
}
