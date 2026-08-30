import { ValidationError } from '../kernel/errors.js';
import { newDeviceId, type DeviceId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export type DeviceType =
  'PHONE' | 'TABLET' | 'TV' | 'HOME_PANEL' | 'SPEAKER' | 'WATCH' | 'COMPUTER' | 'OTHER';

export type DeviceTrustLevel = 'UNTRUSTED' | 'LIMITED' | 'TRUSTED' | 'HIGH_TRUST';
export type DeviceConnectionState = 'ONLINE' | 'STALE' | 'OFFLINE';

export interface Device {
  readonly id: DeviceId;
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId;
  readonly deviceType: DeviceType;
  readonly platform: string;
  readonly room?: string;
  readonly capabilities: readonly string[];
  readonly trustLevel: DeviceTrustLevel;
  readonly connectionState: DeviceConnectionState;
  readonly agentVersion: string;
  readonly publicKeyPem: string;
  readonly lastSeenAt: Date;
  readonly registeredAt: Date;
  readonly revokedAt?: Date;
}

export interface CreateDeviceInput {
  readonly id?: DeviceId;
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId;
  readonly deviceType: DeviceType;
  readonly platform: string;
  readonly room?: string;
  readonly capabilities: readonly string[];
  readonly trustLevel: DeviceTrustLevel;
  readonly connectionState: DeviceConnectionState;
  readonly agentVersion: string;
  readonly publicKeyPem: string;
  readonly lastSeenAt: Date;
  readonly registeredAt: Date;
  readonly revokedAt?: Date;
}

function requireText(field: string, value: string): void {
  if (value.trim().length === 0) {
    throw new ValidationError(`${field} must not be empty`, { field });
  }
}

export function createDevice(input: CreateDeviceInput): Device {
  requireText('platform', input.platform);
  requireText('agentVersion', input.agentVersion);
  requireText('publicKeyPem', input.publicKeyPem);

  if (input.lastSeenAt.getTime() < input.registeredAt.getTime()) {
    throw new ValidationError('lastSeenAt must not be before registeredAt', {
      field: 'lastSeenAt',
    });
  }

  if (input.revokedAt !== undefined && input.revokedAt.getTime() < input.registeredAt.getTime()) {
    throw new ValidationError('revokedAt must not be before registeredAt', {
      field: 'revokedAt',
    });
  }

  return Object.freeze({
    id: input.id ?? newDeviceId(),
    householdId: input.householdId,
    ...(input.ownerPersonId === undefined ? {} : { ownerPersonId: input.ownerPersonId }),
    deviceType: input.deviceType,
    platform: input.platform,
    ...(input.room === undefined ? {} : { room: input.room }),
    capabilities: Object.freeze([...input.capabilities]),
    trustLevel: input.trustLevel,
    connectionState: input.connectionState,
    agentVersion: input.agentVersion,
    publicKeyPem: input.publicKeyPem,
    lastSeenAt: new Date(input.lastSeenAt),
    registeredAt: new Date(input.registeredAt),
    ...(input.revokedAt === undefined ? {} : { revokedAt: new Date(input.revokedAt) }),
  });
}
