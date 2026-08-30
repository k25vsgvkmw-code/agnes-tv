import type { HouseholdId, PersonId } from '../kernel/ids.js';
import type { HealthKind, HealthProvider } from './health-measurement.js';

export type HealthBridgeAuthState = 'active' | 'expired' | 'revoked';

export interface HealthBridgeRegistration {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly provider: HealthProvider;
  readonly sourceDeviceId: string;
  readonly tokenHash: string;
  readonly allowedKinds: readonly HealthKind[];
  readonly authState: HealthBridgeAuthState;
  readonly lastHeartbeatAt: Date | null;
  readonly lastMeasurementAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type HealthBridgeStatusState =
  'live' | 'connected_no_data' | 'degraded' | 'disconnected' | 'auth_expired';

export interface HealthBridgeStatus {
  readonly state: HealthBridgeStatusState;
  readonly lastHeartbeatAt: Date | null;
  readonly lastMeasurementAt: Date | null;
  readonly evaluatedAt: Date;
}
