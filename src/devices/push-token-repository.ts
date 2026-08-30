import type { DeviceId } from '../kernel/ids.js';

export interface DevicePushToken {
  readonly id: string;
  readonly deviceId: DeviceId;
  readonly provider: string;
  readonly token: string;
  readonly createdAt: Date;
  readonly revokedAt?: Date;
}

export interface RegisterPushTokenInput {
  readonly deviceId: DeviceId;
  readonly provider: string;
  readonly token: string;
  readonly createdAt: Date;
}

export interface PushTokenRepository {
  register(input: RegisterPushTokenInput): Promise<DevicePushToken>;
  listActiveForDevice(deviceId: DeviceId): Promise<readonly DevicePushToken[]>;
  revokeForDevice(deviceId: DeviceId, revokedAt: Date): Promise<void>;
}
