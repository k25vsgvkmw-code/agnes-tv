import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { HealthBridgeAuthenticator } from '../health/health-authenticator.js';
import type { HealthBridgeRegistration } from '../health/health-bridge.js';
import type { RawHealthMeasurement } from '../health/health-measurement.js';
import type { HealthMeasurementImportResult } from '../health/import-health-measurement.js';
import type { HealthStatusService } from '../health/health-status-service.js';
import { AgnesError } from '../kernel/errors.js';

export interface HealthRoutesDependencies {
  readonly authenticator: HealthBridgeAuthenticator;
  readonly statusService: HealthStatusService;
  readonly recordHeartbeat: (bridge: HealthBridgeRegistration) => Promise<void>;
  readonly importMeasurement: (
    raw: RawHealthMeasurement,
    bridge: HealthBridgeRegistration,
    correlationId: string,
  ) => Promise<HealthMeasurementImportResult>;
}

const measurementFields = new Set([
  'kind',
  'value',
  'unit',
  'measuredAt',
  'externalId',
  'metadata',
]);

const measurementBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'value', 'unit', 'measuredAt'],
  properties: {
    kind: {
      type: 'string',
      enum: ['steps', 'heart_rate', 'sleep', 'weight', 'active_energy'],
    },
    value: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['count', 'bpm', 'minutes', 'kg', 'kcal'],
    },
    measuredAt: { type: 'string', minLength: 1 },
    externalId: { type: 'string', minLength: 1 },
    metadata: { type: 'object', additionalProperties: true },
  },
} as const;

function unauthorized(message: string): AgnesError {
  return new AgnesError('HEALTH_AUTH_UNAUTHORIZED', message);
}

function readBearerToken(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string') {
    throw unauthorized('bearer credential is required');
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  if (token === undefined || token.length === 0) {
    throw unauthorized('bearer credential is required');
  }

  return token;
}

async function authenticate(
  request: FastifyRequest,
  dependencies: HealthRoutesDependencies,
): Promise<HealthBridgeRegistration> {
  return dependencies.authenticator.authenticate(readBearerToken(request));
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof AgnesError) {
    const statusCode =
      error.code === 'HEALTH_AUTH_UNAUTHORIZED' || error.code === 'HEALTH_AUTH_EXPIRED'
        ? 401
        : error.code === 'VALIDATION_ERROR' || error.code === 'HEALTH_KIND_NOT_ALLOWED'
          ? 400
          : 500;

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

function rejectUnsupportedMeasurementFields(request: FastifyRequest, reply: FastifyReply) {
  if (request.body === null || typeof request.body !== 'object' || Array.isArray(request.body)) return;

  const unsupported = Object.keys(request.body).filter((field) => !measurementFields.has(field));
  if (unsupported.length === 0) return;

  return reply.code(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'measurement request contains unsupported fields',
    },
  });
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  dependencies?: HealthRoutesDependencies,
): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' as const }));

  if (dependencies === undefined) return;

  app.post('/integrations/health/heartbeat', async (request, reply) => {
    try {
      const bridge = await authenticate(request, dependencies);
      await dependencies.recordHeartbeat(bridge);
      return reply.code(204).send();
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Body: RawHealthMeasurement }>(
    '/integrations/health/measurements',
    {
      schema: { body: measurementBodySchema },
      preValidation: rejectUnsupportedMeasurementFields,
    },
    async (request, reply) => {
      try {
        const bridge = await authenticate(request, dependencies);
        const result = await dependencies.importMeasurement(request.body, bridge, request.id);
        return reply.code(result.change === 'created' ? 201 : 200).send({
          id: result.measurement.id,
          change: result.change,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.get('/integrations/health/status', async (request, reply) => {
    try {
      const bridge = await authenticate(request, dependencies);
      const status = await dependencies.statusService.getStatus(bridge.id);
      return reply.code(200).send(status);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
