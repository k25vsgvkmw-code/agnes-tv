import type { Clock } from '../kernel/clock.js';
import type { HealthBridgeRegistration } from './health-bridge.js';
import type { HealthBridgeRepository } from './health-repositories.js';

export interface RecordHealthHeartbeatDependencies {
  readonly bridgeRepository: HealthBridgeRepository;
  readonly clock: Clock;
}

export async function recordHealthHeartbeat(
  bridge: HealthBridgeRegistration,
  dependencies: RecordHealthHeartbeatDependencies,
): Promise<void> {
  await dependencies.bridgeRepository.recordHeartbeat(bridge.id, dependencies.clock.now());
}
