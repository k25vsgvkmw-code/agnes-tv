import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDevice, type Device } from '../../src/devices/device.js';
import type { DeviceRepository } from '../../src/devices/device-repository.js';
import { verifyDeviceSignature } from '../../src/devices/device-signature.js';
import { AgnesError } from '../../src/kernel/errors.js';
import { newHouseholdId } from '../../src/kernel/ids.js';

const now = new Date('2026-09-01T15:00:00Z');
const rawBody = Buffer.from('{"semanticPlace":"HOME"}', 'utf8');

function fixture(revokedAt?: Date) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const device = createDevice({
    householdId: newHouseholdId(),
    deviceType: 'PHONE',
    platform: 'IOS',
    capabilities: ['LOCATION'],
    trustLevel: 'TRUSTED',
    connectionState: 'ONLINE',
    agentVersion: '2.0.0',
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    lastSeenAt: new Date('2026-09-01T14:55:00Z'),
    registeredAt: new Date('2026-09-01T14:00:00Z'),
    ...(revokedAt === undefined ? {} : { revokedAt }),
  });

  return { device, privateKey };
}

function repositoryWith(device: Device | null): DeviceRepository {
  return {
    async save() {},
    async get() {
      return device;
    },
    async recordHeartbeat() {},
    async revoke() {},
    async listReachable() {
      return [];
    },
  };
}

function signatureFor(
  device: Device,
  privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'],
  timestamp: Date,
  body = rawBody,
): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signedBytes = Buffer.from(`${device.id}\n${timestamp.toISOString()}\n${bodyHash}`, 'utf8');
  return sign(null, signedBytes, privateKey).toString('base64');
}

async function expectCode(operation: Promise<unknown>, code: string): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AgnesError);
    expect((error as AgnesError).code).toBe(code);
  }
}

describe('device signature verifier', () => {
  it('accepts an Ed25519 signature over device id, timestamp, and raw body hash', async () => {
    const { device, privateKey } = fixture();
    const timestamp = new Date('2026-09-01T14:59:00Z');

    const verified = await verifyDeviceSignature({
      deviceId: device.id,
      timestamp: timestamp.toISOString(),
      signature: signatureFor(device, privateKey, timestamp),
      rawBody,
      now,
      deviceRepository: repositoryWith(device),
    });

    expect(verified.id).toBe(device.id);
  });

  it('rejects a signature when the raw request body changes', async () => {
    const { device, privateKey } = fixture();
    const timestamp = new Date('2026-09-01T14:59:00Z');

    await expectCode(
      verifyDeviceSignature({
        deviceId: device.id,
        timestamp: timestamp.toISOString(),
        signature: signatureFor(device, privateKey, timestamp),
        rawBody: Buffer.from('{"semanticPlace":"WORK"}', 'utf8'),
        now,
        deviceRepository: repositoryWith(device),
      }),
      'DEVICE_SIGNATURE_INVALID',
    );
  });

  it.each([
    ['older', new Date('2026-09-01T14:54:59Z')],
    ['newer', new Date('2026-09-01T15:05:01Z')],
  ])('rejects a timestamp more than five minutes %s than the verifier clock', async (_, timestamp) => {
    const { device, privateKey } = fixture();

    await expectCode(
      verifyDeviceSignature({
        deviceId: device.id,
        timestamp: timestamp.toISOString(),
        signature: signatureFor(device, privateKey, timestamp),
        rawBody,
        now,
        deviceRepository: repositoryWith(device),
      }),
      'DEVICE_TIMESTAMP_INVALID',
    );
  });

  it('rejects an unknown device before cryptographic verification', async () => {
    const { device, privateKey } = fixture();
    const timestamp = new Date('2026-09-01T14:59:00Z');

    await expectCode(
      verifyDeviceSignature({
        deviceId: device.id,
        timestamp: timestamp.toISOString(),
        signature: signatureFor(device, privateKey, timestamp),
        rawBody,
        now,
        deviceRepository: repositoryWith(null),
      }),
      'DEVICE_UNKNOWN',
    );
  });

  it('rejects a revoked device even when its signature is valid', async () => {
    const { device, privateKey } = fixture(new Date('2026-09-01T14:58:00Z'));
    const timestamp = new Date('2026-09-01T14:59:00Z');

    await expectCode(
      verifyDeviceSignature({
        deviceId: device.id,
        timestamp: timestamp.toISOString(),
        signature: signatureFor(device, privateKey, timestamp),
        rawBody,
        now,
        deviceRepository: repositoryWith(device),
      }),
      'DEVICE_REVOKED',
    );
  });
});
