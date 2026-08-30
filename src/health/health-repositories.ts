import type { HealthBridgeRegistration } from './health-bridge.js';
import type { HealthMeasurement } from './health-measurement.js';

export interface HealthBridgeRepository {
  getById(id: string): Promise<HealthBridgeRegistration | null>;
  getByTokenHash(tokenHash: string): Promise<HealthBridgeRegistration | null>;
  save(bridge: HealthBridgeRegistration): Promise<void>;
  recordHeartbeat(id: string, at: Date): Promise<void>;
  recordMeasurementSeen(id: string, at: Date): Promise<void>;
}

export type HealthMeasurementInsertChange = 'created' | 'unchanged';

export interface HealthMeasurementRepository {
  insertIfAbsent(
    measurement: HealthMeasurement,
  ): Promise<{ measurement: HealthMeasurement; change: HealthMeasurementInsertChange }>;
  getLatestMeasuredAt(bridgeId: string): Promise<Date | null>;
}
