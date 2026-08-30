import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  DevicePushToken,
  PushTokenRepository,
  RegisterPushTokenInput,
} from '../devices/push-token-repository.js';
import type { DeviceId } from '../kernel/ids.js';

interface PushTokenRow {
  readonly id: string;
  readonly device_id: string;
  readonly provider: string;
  readonly token: string;
  readonly created_at: Date;
  readonly revoked_at: Date | null;
}

function mapPushToken(row: PushTokenRow): DevicePushToken {
  return {
    id: row.id,
    deviceId: row.device_id as DeviceId,
    provider: row.provider,
    token: row.token,
    createdAt: new Date(row.created_at),
    ...(row.revoked_at === null ? {} : { revokedAt: new Date(row.revoked_at) }),
  };
}

export class PostgresPushTokenRepository implements PushTokenRepository {
  constructor(private readonly database: Pool) {}

  async register(input: RegisterPushTokenInput): Promise<DevicePushToken> {
    const result = await this.database.query<PushTokenRow>(
      `INSERT INTO device_push_tokens(id, device_id, provider, token, created_at)
       VALUES($1, $2, $3, $4, $5)
       ON CONFLICT(provider, token) DO UPDATE SET
         device_id = EXCLUDED.device_id,
         created_at = EXCLUDED.created_at,
         revoked_at = NULL
       RETURNING id, device_id, provider, token, created_at, revoked_at`,
      [randomUUID(), input.deviceId, input.provider, input.token, input.createdAt],
    );

    return mapPushToken(result.rows[0]!);
  }

  async listActiveForDevice(deviceId: DeviceId): Promise<readonly DevicePushToken[]> {
    const result = await this.database.query<PushTokenRow>(
      `SELECT token.id, token.device_id, token.provider, token.token, token.created_at, token.revoked_at
       FROM device_push_tokens token
       INNER JOIN devices device ON device.id = token.device_id
       WHERE token.device_id = $1
         AND token.revoked_at IS NULL
         AND device.revoked_at IS NULL
       ORDER BY token.created_at, token.id`,
      [deviceId],
    );

    return result.rows.map(mapPushToken);
  }

  async revokeForDevice(deviceId: DeviceId, revokedAt: Date): Promise<void> {
    await this.database.query(
      `UPDATE device_push_tokens
       SET revoked_at = $2
       WHERE device_id = $1
         AND revoked_at IS NULL`,
      [deviceId, revokedAt],
    );
  }
}
