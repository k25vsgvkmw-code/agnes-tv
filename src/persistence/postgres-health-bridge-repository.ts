import type { Pool, PoolClient } from 'pg';
import type { HealthBridgeAuthState, HealthBridgeRegistration } from '../health/health-bridge.js';
import type { HealthKind, HealthProvider } from '../health/health-measurement.js';
import type { HealthBridgeRepository } from '../health/health-repositories.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

type Queryable = Pool | PoolClient;

interface HealthBridgeRow {
  id: string;
  household_id: string;
  person_id: string;
  provider: HealthProvider;
  source_device_id: string;
  token_hash: string;
  allowed_kinds: HealthKind[];
  auth_state: HealthBridgeAuthState;
  last_heartbeat_at: Date | null;
  last_measurement_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToBridge(row: HealthBridgeRow): HealthBridgeRegistration {
  return {
    id: row.id,
    householdId: row.household_id as HouseholdId,
    personId: row.person_id as PersonId,
    provider: row.provider,
    sourceDeviceId: row.source_device_id,
    tokenHash: row.token_hash,
    allowedKinds: row.allowed_kinds,
    authState: row.auth_state,
    lastHeartbeatAt: row.last_heartbeat_at === null ? null : new Date(row.last_heartbeat_at),
    lastMeasurementAt: row.last_measurement_at === null ? null : new Date(row.last_measurement_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const bridgeSelect = `
  SELECT id, household_id, person_id, provider, source_device_id, token_hash,
         allowed_kinds, auth_state, last_heartbeat_at, last_measurement_at,
         created_at, updated_at
  FROM health_bridges`;

export class PostgresHealthBridgeRepository implements HealthBridgeRepository {
  constructor(private readonly pool: Pool) {}

  async getById(id: string): Promise<HealthBridgeRegistration | null> {
    const result = await this.pool.query<HealthBridgeRow>(`${bridgeSelect} WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row === undefined ? null : rowToBridge(row);
  }

  async getByTokenHash(tokenHash: string): Promise<HealthBridgeRegistration | null> {
    const result = await this.pool.query<HealthBridgeRow>(`${bridgeSelect} WHERE token_hash = $1`, [
      tokenHash,
    ]);
    const row = result.rows[0];
    return row === undefined ? null : rowToBridge(row);
  }

  async save(bridge: HealthBridgeRegistration): Promise<void> {
    await this.pool.query(
      `INSERT INTO health_bridges (
         id, household_id, person_id, provider, source_device_id, token_hash, allowed_kinds,
         auth_state, last_heartbeat_at, last_measurement_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         household_id = EXCLUDED.household_id,
         person_id = EXCLUDED.person_id,
         provider = EXCLUDED.provider,
         source_device_id = EXCLUDED.source_device_id,
         token_hash = EXCLUDED.token_hash,
         allowed_kinds = EXCLUDED.allowed_kinds,
         auth_state = EXCLUDED.auth_state,
         last_heartbeat_at = EXCLUDED.last_heartbeat_at,
         last_measurement_at = EXCLUDED.last_measurement_at,
         updated_at = EXCLUDED.updated_at`,
      [
        bridge.id,
        bridge.householdId,
        bridge.personId,
        bridge.provider,
        bridge.sourceDeviceId,
        bridge.tokenHash,
        JSON.stringify(bridge.allowedKinds),
        bridge.authState,
        bridge.lastHeartbeatAt,
        bridge.lastMeasurementAt,
        bridge.createdAt,
        bridge.updatedAt,
      ],
    );
  }

  async recordHeartbeat(id: string, at: Date): Promise<void> {
    await this.pool.query(
      `UPDATE health_bridges
       SET last_heartbeat_at = CASE
             WHEN last_heartbeat_at IS NULL OR last_heartbeat_at < $2 THEN $2
             ELSE last_heartbeat_at
           END,
           updated_at = GREATEST(updated_at, $2)
       WHERE id = $1`,
      [id, at],
    );
  }

  async recordMeasurementSeen(id: string, at: Date, client?: PoolClient): Promise<void> {
    const executor: Queryable = client ?? this.pool;
    await executor.query(
      `UPDATE health_bridges
       SET last_measurement_at = CASE
             WHEN last_measurement_at IS NULL OR last_measurement_at < $2 THEN $2
             ELSE last_measurement_at
           END,
           updated_at = GREATEST(updated_at, $2)
       WHERE id = $1`,
      [id, at],
    );
  }
}
