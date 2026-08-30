import type { CommandId, DeviceId } from '../kernel/ids.js';
import type { OfflineCommand } from './offline-command.js';

export interface OfflineCommandRepository {
  enqueue(command: OfflineCommand): Promise<OfflineCommand>;
  get(id: CommandId): Promise<OfflineCommand | null>;
  getByDeviceAndIdempotencyKey(
    deviceId: DeviceId,
    idempotencyKey: string,
  ): Promise<OfflineCommand | null>;
  markApplied(id: CommandId, appliedAt: Date): Promise<OfflineCommand>;
  markRejected(id: CommandId, rejectionCode: string): Promise<OfflineCommand>;
  markExpired(id: CommandId): Promise<OfflineCommand>;
}
