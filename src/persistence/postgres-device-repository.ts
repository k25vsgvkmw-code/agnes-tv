import type { Pool } from 'pg';
import type { DeviceRepository } from '../devices/device-repository.js';
import {
  createDevice,
  type Device,
  type DeviceConnectionState,
  type DeviceTrustLevel,
  type DeviceType,
} from '../devices/device.js';
import type { DeviceId, HouseholdId, PersonId } from '../kernel/ids.js';

interface DeviceRow {
  readonly id: string;
  readonly household_id: string;
  readonly owner_person_id: string | null;
  readonly device_type: DeviceType;
  readonly platform: string;
  readonly room: string | null;
  readonly capabilities: unknown;
  readonly trust_level: DeviceTrustLevel;
  readonly connection_state: DeviceConnectionState;
  readonly agent_version: string;
  readonly public_key_pem: string;
  readonly last_seen_at: Date;
  readonly registered_at: Date;
  readonly revoked_at: Date | null;
}

const SELECT_COLUMNS = `id, household_id, owner_person_id, device_type, platform, room,
  capabilities, trust_level, connection_state, agent_version, public_key_pem,
  last_seen_at, registered_at, revoked_at`;

function readCapabilities(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return [];
  }
  return value;
}

function mapDevice(row: DeviceRow): Device {
  return createDevice({
    id: row.id as DeviceId,
    householdId: row.household_id as HouseholdId,
    ...(row.owner_person_id === null ? {} : { ownerPersonId: row.owner_person_id as PersonId }),
    deviceType: row.device_type,
    platform: row.platform,
    ...(row.room === null ? {} : { room: row.room }),
    capabilities: readCapabilities(row.capabilities),
    trustLevel: row.trust_level,
    connectionState: row.connection_state,
    agentVersion: row.agent_version,
    publicKeyPem: row.public_key_pem,
    lastSeenAt: row.last_seen_at,
    registeredAt: row.registered_at,
    ...(row.revoked_at === null ? {} : { revokedAt: row.revoked_at }),
  });
}

export class PostgresDeviceRepository implements DeviceRepository {
  constructor(private readonly database: Pool) {}

  async save(device: Device): Promise<void> {
    await this.database.query(
      `INSERT INTO devices(
         id, household_id, owner_person_id, device_type, platform, room, capabilities,
         trust_level, connection_state, agent_version, public_key_pem, last_seen_at,
         registered_at, revoked_at
       )
       VALUES($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT(id) DO UPDATE SET
         household_id = EXCLUDED.household_id,
         owner_person_id = EXCLUDED.owner_person_id,
         device_type = EXCLUDED.device_type,
         platform = EXCLUDED.platform,
         room = EXCLUDED.room,
         capabilities = EXCLUDED.capabilities,
         trust_level = EXCLUDED.trust_level,
         connection_state = CASE
           WHEN devices.revoked_at IS NULL THEN EXCLUDED.connection_state
           ELSE 'OFFLINE'
         END,
         agent_version = EXCLUDED.agent_version,
         public_key_pem = EXCLUDED.public_key_pem,
         last_seen_at = CASE
           WHEN devices.revoked_at IS NULL THEN EXCLUDED.last_seen_at
           ELSE devices.last_seen_at
         END,
         registered_at = devices.registered_at,
         revoked_at = COALESCE(devices.revoked_at, EXCLUDED.revoked_at)`,
      [
        device.id,
        device.householdId,
        device.ownerPersonId ?? null,
        device.deviceType,
        device.platform,
        device.room ?? null,
        JSON.stringify(device.capabilities),
        device.trustLevel,
        device.connectionState,
        device.agentVersion,
        device.publicKeyPem,
        device.lastSeenAt,
        device.registeredAt,
        device.revokedAt ?? null,
      ],
    );
  }

  async get(id: DeviceId): Promise<Device | null> {
    const result = await this.database.query<DeviceRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM devices
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row === undefined ? null : mapDevice(row);
  }

  async recordHeartbeat(id: DeviceId, observedAt: Date): Promise<void> {
    await this.database.query(
      `UPDATE devices
       SET last_seen_at = $2,
           connection_state = 'ONLINE'
       WHERE id = $1
         AND revoked_at IS NULL`,
      [id, observedAt],
    );
  }

  async revoke(id: DeviceId, revokedAt: Date): Promise<void> {
    await this.database.query(
      `UPDATE devices
       SET revoked_at = COALESCE(revoked_at, $2),
           connection_state = 'OFFLINE'
       WHERE id = $1`,
      [id, revokedAt],
    );
  }

  async listReachable(householdId: HouseholdId): Promise<readonly Device[]> {
    const result = await this.database.query<DeviceRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM devices
       WHERE household_id = $1
         AND revoked_at IS NULL
         AND connection_state = 'ONLINE'
       ORDER BY last_seen_at DESC, id`,
      [householdId],
    );

    return result.rows.map(mapDevice);
  }
}
