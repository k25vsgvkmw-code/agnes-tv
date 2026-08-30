import type { HouseholdId, DeviceId } from '../kernel/ids.js';
import type { Device } from './device.js';

export interface DeviceRepository {
  save(device: Device): Promise<void>;
  get(id: DeviceId): Promise<Device | null>;
  recordHeartbeat(id: DeviceId, observedAt: Date): Promise<void>;
  revoke(id: DeviceId, revokedAt: Date): Promise<void>;
  listReachable(householdId: HouseholdId): Promise<readonly Device[]>;
}
