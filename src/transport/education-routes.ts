import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { EducationVersionConflictError } from '../education/education-repository.js';
import {
  EducationGradeMismatchError,
  type EducationService,
} from '../education/education-service.js';
import { NotFoundError, ValidationError } from '../kernel/errors.js';

const learnerParamsSchema = z.object({ learnerId: z.string().min(1) });
const pageParamsSchema = z.object({
  learnerId: z.string().min(1),
  resourceId: z.string().min(1),
  pageId: z.string().min(1),
});
const pageStateParamsSchema = z.object({
  learnerId: z.string().min(1),
  pageId: z.string().min(1),
});
const activityParamsSchema = z.object({
  learnerId: z.string().min(1),
  activityId: z.string().min(1),
});

const strokeSchema = z.object({
  strokeId: z.string().min(1),
  tool: z.enum(['pen', 'highlighter', 'circle', 'drawing']),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
});

const pageInteractionStateSchema = z.object({
  learnerId: z.enum(['vasilis', 'elenios']),
  pageId: z.string().min(1),
  strokes: z.array(strokeSchema),
  typedAnswers: z.record(z.string(), z.string()),
  selections: z.record(z.string(), z.array(z.string())),
  dragDrop: z.record(z.string(), z.string()),
  matching: z.record(z.string(), z.string()),
  ordering: z.record(z.string(), z.array(z.string())),
  numericAnswers: z.record(z.string(), z.number()),
  completedActivityIds: z.array(z.string()),
  currentActivityId: z.string().nullable(),
  activityInProgress: z.boolean(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
});

const autosaveSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  state: pageInteractionStateSchema,
});
const answerSchema = z.object({ answer: z.unknown() });
const breakSchema = z.object({
  uninterruptedMinutes: z.number().nonnegative(),
  completedActivities: z.number().int().nonnegative(),
  activityInProgress: z.boolean(),
});

function sendEducationError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof EducationVersionConflictError) {
    return reply.status(409).send({ code: 'EDUCATION_VERSION_CONFLICT', message: error.message });
  }
  if (error instanceof EducationGradeMismatchError) {
    return reply.status(403).send({ code: error.code, message: error.message });
  }
  if (error instanceof ValidationError) {
    return reply.status(400).send({ code: error.code, message: error.message });
  }
  if (error instanceof NotFoundError) {
    return reply.status(404).send({ code: error.code, message: error.message });
  }
  throw error;
}

export function registerEducationRoutes(
  app: FastifyInstance,
  service: EducationService,
): Promise<void> {
  app.get('/education/learners/:learnerId', (request, reply) => {
    const parsed = learnerParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    try {
      return service.getLearner(parsed.data.learnerId);
    } catch (error) {
      return sendEducationError(reply, error);
    }
  });

  app.get('/education/learners/:learnerId/catalog', (request, reply) => {
    const parsed = learnerParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }
    try {
      return service.getCatalog(parsed.data.learnerId);
    } catch (error) {
      return sendEducationError(reply, error);
    }
  });

  app.get(
    '/education/learners/:learnerId/resources/:resourceId/pages/:pageId',
    (request, reply) => {
      const parsed = pageParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR' });
      }
      try {
        return service.getPage(parsed.data.learnerId, parsed.data.resourceId, parsed.data.pageId);
      } catch (error) {
        return sendEducationError(reply, error);
      }
    },
  );

  app.put('/education/learners/:learnerId/pages/:pageId/state', async (request, reply) => {
    const params = pageStateParamsSchema.safeParse(request.params);
    const payload = autosaveSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }

    try {
      return await service.savePageState(
        params.data.learnerId,
        params.data.pageId,
        payload.data.state,
        payload.data.expectedVersion,
      );
    } catch (error) {
      return sendEducationError(reply, error);
    }
  });

  app.post(
    '/education/learners/:learnerId/activities/:activityId/check',
    async (request, reply) => {
      const params = activityParamsSchema.safeParse(request.params);
      const payload = answerSchema.safeParse(request.body);
      if (!params.success || !payload.success) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR' });
      }

      try {
        return await service.checkActivity(
          params.data.learnerId,
          params.data.activityId,
          payload.data.answer,
        );
      } catch (error) {
        return sendEducationError(reply, error);
      }
    },
  );

  app.post('/education/learners/:learnerId/break/evaluate', (request, reply) => {
    const params = learnerParamsSchema.safeParse(request.params);
    const payload = breakSchema.safeParse(request.body);
    if (!params.success || !payload.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR' });
    }

    try {
      return service.evaluateBreak(params.data.learnerId, payload.data);
    } catch (error) {
      return sendEducationError(reply, error);
    }
  });

  return Promise.resolve();
}
