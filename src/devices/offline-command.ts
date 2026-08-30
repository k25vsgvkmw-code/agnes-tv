import type { DeviceRepository } from './device-repository.js';
import type { Device } from './device.js';
import type { OfflineCommandRepository } from './offline-command-repository.js';
import { AgnesError, ValidationError } from '../kernel/errors.js';
import { newCommandId, type CommandId, type DeviceId, type PersonId } from '../kernel/ids.js';
import type { LivePolicyResult } from '../permissions/live-policy-engine.js';
import type { NamedCapability } from '../permissions/named-capability.js';

export type OfflineCommandStatus = 'PENDING' | 'APPLIED' | 'REJECTED' | 'EXPIRED';

export interface OfflineCommand {
  readonly id: CommandId;
  readonly deviceId: DeviceId;
  readonly actorPersonId: PersonId;
  readonly capability: NamedCapability;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly baseVersion?: string;
  readonly status: OfflineCommandStatus;
  readonly appliedAt?: Date;
  readonly rejectionCode?: string;
}

export interface CreateOfflineCommandInput {
  readonly id?: CommandId;
  readonly deviceId: DeviceId;
  readonly actorPersonId: PersonId;
  readonly capability: NamedCapability;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly baseVersion?: string;
}

export interface OfflineCommandExecutor {
  execute(command: OfflineCommand): Promise<void>;
}

export interface OfflineCommandPolicyEvaluator {
  evaluate(command: OfflineCommand, device: Device): Promise<LivePolicyResult> | LivePolicyResult;
}

export interface ProcessOfflineCommandInput {
  readonly commandId: CommandId;
  readonly now: Date;
  readonly commands: OfflineCommandRepository;
  readonly devices: DeviceRepository;
  readonly policy: OfflineCommandPolicyEvaluator;
  readonly executor: OfflineCommandExecutor;
}

function requireText(field: string, value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} must not be empty`, { field });
  }
  return normalized;
}

function copyValidDate(field: string, value: Date): Date {
  const copy = new Date(value);
  if (Number.isNaN(copy.getTime())) {
    throw new ValidationError(`${field} must be a valid date`, { field });
  }
  return copy;
}

export function createOfflineCommand(input: CreateOfflineCommandInput): OfflineCommand {
  const createdAt = copyValidDate('createdAt', input.createdAt);
  const expiresAt = copyValidDate('expiresAt', input.expiresAt);
  if (expiresAt.getTime() <= createdAt.getTime()) {
    throw new ValidationError('expiresAt must be after createdAt', {
      field: 'expiresAt',
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  const base = {
    id: input.id ?? newCommandId(),
    deviceId: input.deviceId,
    actorPersonId: input.actorPersonId,
    capability: input.capability,
    payload: Object.freeze({ ...input.payload }),
    idempotencyKey: requireText('idempotencyKey', input.idempotencyKey),
    createdAt,
    expiresAt,
    status: 'PENDING' as const,
  };

  return Object.freeze({
    ...base,
    ...(input.baseVersion === undefined
      ? {}
      : { baseVersion: requireText('baseVersion', input.baseVersion) }),
  });
}

export async function processOfflineCommand(
  input: ProcessOfflineCommandInput,
): Promise<OfflineCommand> {
  const command = await input.commands.get(input.commandId);
  if (command === null) {
    throw new AgnesError('OFFLINE_COMMAND_NOT_FOUND', 'Offline command was not found', {
      commandId: input.commandId,
    });
  }

  if (command.status !== 'PENDING') return command;

  const device = await input.devices.get(command.deviceId);
  if (device === null) {
    return input.commands.markRejected(command.id, 'DEVICE_NOT_FOUND');
  }
  if (device.revokedAt !== undefined) {
    return input.commands.markRejected(command.id, 'DEVICE_REVOKED');
  }

  const now = new Date(input.now);
  if (command.expiresAt.getTime() <= now.getTime()) {
    return input.commands.markExpired(command.id);
  }

  const policyResult = await input.policy.evaluate(command, device);
  if (policyResult !== 'ALLOW') {
    return input.commands.markRejected(command.id, `POLICY_${policyResult}`);
  }

  await input.executor.execute(command);
  return input.commands.markApplied(command.id, now);
}
