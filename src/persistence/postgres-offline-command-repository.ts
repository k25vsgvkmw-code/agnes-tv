import type { Pool } from 'pg';
import type { OfflineCommandRepository } from '../devices/offline-command-repository.js';
import type { OfflineCommand, OfflineCommandStatus } from '../devices/offline-command.js';
import { AgnesError } from '../kernel/errors.js';
import type { CommandId, DeviceId, PersonId } from '../kernel/ids.js';
import type { NamedCapability } from '../permissions/named-capability.js';

interface OfflineCommandRow {
  readonly id: string;
  readonly device_id: string;
  readonly actor_person_id: string;
  readonly capability: NamedCapability;
  readonly payload: unknown;
  readonly idempotency_key: string;
  readonly created_at: Date;
  readonly expires_at: Date;
  readonly base_version: string | null;
  readonly status: OfflineCommandStatus;
  readonly applied_at: Date | null;
  readonly rejection_code: string | null;
}

const SELECT_COLUMNS = `id, device_id, actor_person_id, capability, payload, idempotency_key,
  created_at, expires_at, base_version, status, applied_at, rejection_code`;

function readPayload(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.freeze({ ...(value as Record<string, unknown>) });
}

function mapCommand(row: OfflineCommandRow): OfflineCommand {
  return Object.freeze({
    id: row.id as CommandId,
    deviceId: row.device_id as DeviceId,
    actorPersonId: row.actor_person_id as PersonId,
    capability: row.capability,
    payload: readPayload(row.payload),
    idempotencyKey: row.idempotency_key,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    ...(row.base_version === null ? {} : { baseVersion: row.base_version }),
    status: row.status,
    ...(row.applied_at === null ? {} : { appliedAt: new Date(row.applied_at) }),
    ...(row.rejection_code === null ? {} : { rejectionCode: row.rejection_code }),
  });
}

export class PostgresOfflineCommandRepository implements OfflineCommandRepository {
  constructor(private readonly database: Pool) {}

  async enqueue(command: OfflineCommand): Promise<OfflineCommand> {
    const result = await this.database.query<OfflineCommandRow>(
      `INSERT INTO offline_commands(
         id, device_id, actor_person_id, capability, payload, idempotency_key,
         created_at, expires_at, base_version, status, applied_at, rejection_code
       )
       VALUES($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT(device_id, idempotency_key) DO UPDATE SET
         idempotency_key = offline_commands.idempotency_key
       RETURNING ${SELECT_COLUMNS}`,
      [
        command.id,
        command.deviceId,
        command.actorPersonId,
        command.capability,
        JSON.stringify(command.payload),
        command.idempotencyKey,
        command.createdAt,
        command.expiresAt,
        command.baseVersion ?? null,
        command.status,
        command.appliedAt ?? null,
        command.rejectionCode ?? null,
      ],
    );

    return mapCommand(this.requireRow(result.rows[0], command.id));
  }

  async get(id: CommandId): Promise<OfflineCommand | null> {
    const result = await this.database.query<OfflineCommandRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM offline_commands
       WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCommand(row);
  }

  async getByDeviceAndIdempotencyKey(
    deviceId: DeviceId,
    idempotencyKey: string,
  ): Promise<OfflineCommand | null> {
    const result = await this.database.query<OfflineCommandRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM offline_commands
       WHERE device_id = $1
         AND idempotency_key = $2`,
      [deviceId, idempotencyKey],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCommand(row);
  }

  async markApplied(id: CommandId, appliedAt: Date): Promise<OfflineCommand> {
    return this.updateStatus(id, 'APPLIED', appliedAt, null);
  }

  async markRejected(id: CommandId, rejectionCode: string): Promise<OfflineCommand> {
    return this.updateStatus(id, 'REJECTED', null, rejectionCode);
  }

  async markExpired(id: CommandId): Promise<OfflineCommand> {
    return this.updateStatus(id, 'EXPIRED', null, null);
  }

  private async updateStatus(
    id: CommandId,
    status: OfflineCommandStatus,
    appliedAt: Date | null,
    rejectionCode: string | null,
  ): Promise<OfflineCommand> {
    const result = await this.database.query<OfflineCommandRow>(
      `UPDATE offline_commands
       SET status = $2,
           applied_at = $3,
           rejection_code = $4
       WHERE id = $1
         AND status = 'PENDING'
       RETURNING ${SELECT_COLUMNS}`,
      [id, status, appliedAt, rejectionCode],
    );
    const updated = result.rows[0];
    if (updated !== undefined) return mapCommand(updated);

    const existing = await this.get(id);
    if (existing !== null) return existing;
    throw new AgnesError('OFFLINE_COMMAND_NOT_FOUND', 'Offline command was not found', {
      commandId: id,
    });
  }

  private requireRow(row: OfflineCommandRow | undefined, id: CommandId): OfflineCommandRow {
    if (row !== undefined) return row;
    throw new AgnesError('OFFLINE_COMMAND_NOT_FOUND', 'Offline command was not found', {
      commandId: id,
    });
  }
}
