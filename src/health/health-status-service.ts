import type { Clock } from '../kernel/clock.js';
import type { HealthBridgeStatus, HealthBridgeStatusState } from './health-bridge.js';
import type { HealthConfig } from './health-config.js';
import type { HealthBridgeRepository } from './health-repositories.js';

function ageMs(now: Date, timestamp: Date): number {
  return Math.max(0, now.getTime() - timestamp.getTime());
}

function latestActivity(
  lastHeartbeatAt: Date | null,
  lastMeasurementAt: Date | null,
): Date | null {
  if (lastHeartbeatAt === null) return lastMeasurementAt;
  if (lastMeasurementAt === null) return lastHeartbeatAt;
  return lastHeartbeatAt.getTime() >= lastMeasurementAt.getTime()
    ? lastHeartbeatAt
    : lastMeasurementAt;
}

export class HealthStatusService {
  constructor(
    private readonly bridgeRepository: HealthBridgeRepository,
    private readonly clock: Clock,
    private readonly config: HealthConfig,
  ) {}

  async getStatus(bridgeId: string): Promise<HealthBridgeStatus> {
    const evaluatedAt = this.clock.now();
    const bridge = await this.bridgeRepository.getById(bridgeId);

    if (bridge === null) {
      return {
        state: 'disconnected',
        lastHeartbeatAt: null,
        lastMeasurementAt: null,
        evaluatedAt,
      };
    }

    let state: HealthBridgeStatusState;

    if (bridge.authState !== 'active') {
      state = 'auth_expired';
    } else if (
      bridge.lastMeasurementAt !== null &&
      ageMs(evaluatedAt, bridge.lastMeasurementAt) <= this.config.measurementFreshnessMs
    ) {
      state = 'live';
    } else {
      const activity = latestActivity(bridge.lastHeartbeatAt, bridge.lastMeasurementAt);
      if (
        activity !== null &&
        ageMs(evaluatedAt, activity) <= this.config.heartbeatFreshnessMs
      ) {
        state = 'connected_no_data';
      } else if (
        activity !== null &&
        ageMs(evaluatedAt, activity) <= this.config.degradedGraceMs
      ) {
        state = 'degraded';
      } else {
        state = 'disconnected';
      }
    }

    return {
      state,
      lastHeartbeatAt: bridge.lastHeartbeatAt,
      lastMeasurementAt: bridge.lastMeasurementAt,
      evaluatedAt,
    };
  }
}
