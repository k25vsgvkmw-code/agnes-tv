import { Readable } from 'node:stream';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { DeviceRepository } from '../devices/device-repository.js';
import { readDeviceAgentLocationSignal } from '../devices/device-agent-signal.js';
import { verifyDeviceSignature } from '../devices/device-signature.js';
import { AgnesError, ValidationError } from '../kernel/errors.js';
import type { DeviceId } from '../kernel/ids.js';
import type { LocationSignal } from '../location/location-signal.js';

export interface DeviceAgentRouteDependencies {
  readonly deviceRepository: DeviceRepository;
  readonly now: () => Date;
  readonly ingestLocationSignal: (signal: LocationSignal) => Promise<void>;
}

function readRequiredHeader(request: FastifyRequest, name: string): string | null {
  const value = request.headers[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function authenticationStatus(error: AgnesError): number {
  return error.code === 'DEVICE_REVOKED' ? 403 : 401;
}

export async function registerDeviceAgentRoutes(
  app: FastifyInstance,
  dependencies: DeviceAgentRouteDependencies,
): Promise<void> {
  const rawBodies = new WeakMap<FastifyRequest, Buffer>();

  app.post(
    '/live/device/signals/location',
    {
      preParsing: async (request, _reply, payload) => {
        const chunks: Buffer[] = [];
        for await (const chunk of payload) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
        }
        const rawBody = Buffer.concat(chunks);
        rawBodies.set(request, rawBody);

        const replay = Readable.from([rawBody]) as Readable & { receivedEncodedLength: number };
        replay.receivedEncodedLength = rawBody.length;
        return replay;
      },
    },
    async (request, reply) => {
      const deviceId = readRequiredHeader(request, 'x-agnes-device-id');
      const timestamp = readRequiredHeader(request, 'x-agnes-timestamp');
      const signature = readRequiredHeader(request, 'x-agnes-signature');
      const rawBody = rawBodies.get(request);

      if (deviceId === null || timestamp === null || signature === null || rawBody === undefined) {
        return reply.code(401).send({ error: { code: 'DEVICE_SIGNATURE_INVALID' } });
      }

      try {
        await verifyDeviceSignature({
          deviceId: deviceId as DeviceId,
          timestamp,
          signature,
          rawBody,
          now: dependencies.now(),
          deviceRepository: dependencies.deviceRepository,
        });
      } catch (error) {
        if (error instanceof AgnesError) {
          return reply.code(authenticationStatus(error)).send({ error: { code: error.code } });
        }
        throw error;
      }

      let signal: LocationSignal;
      try {
        signal = readDeviceAgentLocationSignal(request.body, deviceId as DeviceId);
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.code(400).send({ error: { code: 'LOCATION_SIGNAL_INVALID' } });
        }
        throw error;
      }

      await dependencies.ingestLocationSignal(signal);
      return reply.code(202).send({ accepted: true });
    },
  );
}
