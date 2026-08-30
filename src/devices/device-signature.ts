import { createHash, verify } from 'node:crypto';
import type { DeviceRepository } from './device-repository.js';
import type { Device } from './device.js';
import { AgnesError } from '../kernel/errors.js';
import type { DeviceId } from '../kernel/ids.js';

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export interface VerifyDeviceSignatureInput {
  readonly deviceId: DeviceId;
  readonly timestamp: string;
  readonly signature: string;
  readonly rawBody: Buffer;
  readonly now: Date;
  readonly deviceRepository: DeviceRepository;
}

function timestampOrThrow(value: string, now: Date): Date {
  const timestamp = new Date(value);
  const time = timestamp.getTime();
  if (!Number.isFinite(time) || Math.abs(now.getTime() - time) > MAX_TIMESTAMP_SKEW_MS) {
    throw new AgnesError('DEVICE_TIMESTAMP_INVALID', 'Device request timestamp is invalid');
  }
  return timestamp;
}

function canonicalSignedBytes(deviceId: DeviceId, timestamp: Date, rawBody: Buffer): Buffer {
  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  return Buffer.from(`${deviceId}\n${timestamp.toISOString()}\n${bodyHash}`, 'utf8');
}

export async function verifyDeviceSignature(input: VerifyDeviceSignatureInput): Promise<Device> {
  const device = await input.deviceRepository.get(input.deviceId);
  if (device === null) {
    throw new AgnesError('DEVICE_UNKNOWN', 'Device is not registered');
  }
  if (device.revokedAt !== undefined) {
    throw new AgnesError('DEVICE_REVOKED', 'Device has been revoked');
  }

  const timestamp = timestampOrThrow(input.timestamp, input.now);
  const signedBytes = canonicalSignedBytes(input.deviceId, timestamp, input.rawBody);

  let valid = false;
  try {
    valid = verify(null, signedBytes, device.publicKeyPem, Buffer.from(input.signature, 'base64'));
  } catch {
    valid = false;
  }

  if (!valid) {
    throw new AgnesError('DEVICE_SIGNATURE_INVALID', 'Device signature is invalid');
  }

  return device;
}
