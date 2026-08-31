import type { FastifyInstance, FastifyReply } from 'fastify';
import { AgnesError } from '../kernel/errors.js';
import type { NotificationId } from '../kernel/ids.js';
import type { Notification } from '../notifications/notification.js';

export interface NotificationRoutesDependencies {
  readonly acknowledge: (notificationId: NotificationId) => Promise<Notification>;
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof AgnesError) {
    const statusCode = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 500;
    return reply.code(statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  return reply.code(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'internal server error',
    },
  });
}

export async function registerNotificationRoutes(
  app: FastifyInstance,
  dependencies: NotificationRoutesDependencies,
): Promise<void> {
  app.post<{ Params: { id: string } }>('/notifications/:id/acknowledge', async (request, reply) => {
    try {
      const notification = await dependencies.acknowledge(request.params.id as NotificationId);
      return reply.code(200).send({
        id: notification.id,
        state: notification.state,
        acknowledgedAt: notification.acknowledgedAt,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
