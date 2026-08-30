import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDevice, type Device } from '../../src/devices/device.js';
import type { DeviceRepository } from '../../src/devices/device-repository.js';
import {
  createOfflineCommand,
  processOfflineCommand,
  type OfflineCommand,
  type OfflineCommandExecutor,
  type OfflineCommandPolicyEvaluator,
} from '../../src/devices/offline-command.js';
import type { OfflineCommandRepository } from '../../src/devices/offline-command-repository.js';
import { newHouseholdId, newPersonId } from '../../src/kernel/ids.js';

class MemoryCommandRepository implements OfflineCommandRepository {
  private readonly byId = new Map<string, OfflineCommand>();
  private readonly byIdempotency = new Map<string, string>();

  async enqueue(command: OfflineCommand): Promise<OfflineCommand> {
    const key = `${command.deviceId}:${command.idempotencyKey}`;
    const existingId = this.byIdempotency.get(key);
    if (existingId !== undefined) return this.byId.get(existingId)!;
    this.byId.set(command.id, command);
    this.byIdempotency.set(key, command.id);
    return command;
  }

  async get(id: OfflineCommand['id']): Promise<OfflineCommand | null> {
    return this.byId.get(id) ?? null;
  }

  async getByDeviceAndIdempotencyKey(
    deviceId: OfflineCommand['deviceId'],
    idempotencyKey: string,
  ): Promise<OfflineCommand | null> {
    const id = this.byIdempotency.get(`${deviceId}:${idempotencyKey}`);
    return id === undefined ? null : (this.byId.get(id) ?? null);
  }

  async markApplied(id: OfflineCommand['id'], appliedAt: Date): Promise<OfflineCommand> {
    return this.replace(id, { status: 'APPLIED', appliedAt });
  }

  async markRejected(id: OfflineCommand['id'], rejectionCode: string): Promise<OfflineCommand> {
    return this.replace(id, { status: 'REJECTED', rejectionCode });
  }

  async markExpired(id: OfflineCommand['id']): Promise<OfflineCommand> {
    return this.replace(id, { status: 'EXPIRED' });
  }

  private replace(
    id: OfflineCommand['id'],
    patch: Partial<OfflineCommand>,
  ): OfflineCommand {
    const current = this.byId.get(id);
    if (current === undefined) throw new Error('missing command');
    const next = { ...current, ...patch } as OfflineCommand;
    this.byId.set(id, next);
    return next;
  }
}

class MemoryDeviceRepository implements DeviceRepository {
  constructor(private device: Device) {}

  async save(device: Device): Promise<void> {
    this.device = device;
  }
  async get(): Promise<Device | null> {
    return this.device;
  }
  async recordHeartbeat(): Promise<void> {}
  async revoke(): Promise<void> {}
  async listReachable(): Promise<readonly Device[]> {
    return this.device.revokedAt === undefined ? [this.device] : [];
  }
}

function publicKeyPem(): string {
  const { publicKey } = generateKeyPairSync('ed25519');
  return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}

function device(revokedAt?: Date): Device {
  const registeredAt = new Date('2026-09-01T14:00:00Z');
  return createDevice({
    householdId: newHouseholdId(),
    ownerPersonId: newPersonId(),
    deviceType: 'PHONE',
    platform: 'IOS',
    capabilities: ['shopping.list.modify'],
    trustLevel: 'TRUSTED',
    connectionState: revokedAt === undefined ? 'ONLINE' : 'OFFLINE',
    agentVersion: '2.0.0',
    publicKeyPem: publicKeyPem(),
    lastSeenAt: new Date('2026-09-01T14:55:00Z'),
    registeredAt,
    ...(revokedAt === undefined ? {} : { revokedAt }),
  });
}

function command(targetDevice: Device, expiresAt = new Date('2026-09-01T15:10:00Z')) {
  return createOfflineCommand({
    deviceId: targetDevice.id,
    actorPersonId: targetDevice.ownerPersonId!,
    capability: 'shopping.list.modify',
    payload: { item: 'milk' },
    idempotencyKey: 'shopping-add-milk-1',
    createdAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt,
  });
}

function countingExecutor() {
  const calls: OfflineCommand[] = [];
  const executor: OfflineCommandExecutor = {
    async execute(value) {
      calls.push(value);
    },
  };
  return { calls, executor };
}

function policy(result: Awaited<ReturnType<OfflineCommandPolicyEvaluator['evaluate']>>) {
  const evaluator: OfflineCommandPolicyEvaluator = {
    async evaluate() {
      return result;
    },
  };
  return evaluator;
}

describe('Live v2 offline command processing', () => {
  it('marks expired commands EXPIRED without calling policy or executor', async () => {
    const targetDevice = device();
    const repository = new MemoryCommandRepository();
    const queued = await repository.enqueue(command(targetDevice, new Date('2026-09-01T15:05:00Z')));
    const { calls, executor } = countingExecutor();
    let policyCalls = 0;
    const evaluator: OfflineCommandPolicyEvaluator = {
      async evaluate() {
        policyCalls += 1;
        return 'ALLOW';
      },
    };

    const result = await processOfflineCommand({
      commandId: queued.id,
      now: new Date('2026-09-01T15:05:00Z'),
      commands: repository,
      devices: new MemoryDeviceRepository(targetDevice),
      policy: evaluator,
      executor,
    });

    expect(result.status).toBe('EXPIRED');
    expect(policyCalls).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('rejects a command from a currently revoked device with zero side effects', async () => {
    const targetDevice = device(new Date('2026-09-01T15:02:00Z'));
    const repository = new MemoryCommandRepository();
    const queued = await repository.enqueue(command(targetDevice));
    const { calls, executor } = countingExecutor();

    const result = await processOfflineCommand({
      commandId: queued.id,
      now: new Date('2026-09-01T15:03:00Z'),
      commands: repository,
      devices: new MemoryDeviceRepository(targetDevice),
      policy: policy('ALLOW'),
      executor,
    });

    expect(result).toMatchObject({ status: 'REJECTED', rejectionCode: 'DEVICE_REVOKED' });
    expect(calls).toHaveLength(0);
  });

  it('rechecks current live policy and rejects DENY before execution', async () => {
    const targetDevice = device();
    const repository = new MemoryCommandRepository();
    const queued = await repository.enqueue(command(targetDevice));
    const { calls, executor } = countingExecutor();

    const result = await processOfflineCommand({
      commandId: queued.id,
      now: new Date('2026-09-01T15:03:00Z'),
      commands: repository,
      devices: new MemoryDeviceRepository(targetDevice),
      policy: policy('DENY'),
      executor,
    });

    expect(result).toMatchObject({ status: 'REJECTED', rejectionCode: 'POLICY_DENY' });
    expect(calls).toHaveLength(0);
  });

  it('executes an idempotent command only once across repeated processing', async () => {
    const targetDevice = device();
    const repository = new MemoryCommandRepository();
    const first = await repository.enqueue(command(targetDevice));
    const duplicate = await repository.enqueue(
      createOfflineCommand({
        deviceId: targetDevice.id,
        actorPersonId: targetDevice.ownerPersonId!,
        capability: 'shopping.list.modify',
        payload: { item: 'different' },
        idempotencyKey: first.idempotencyKey,
        createdAt: new Date('2026-09-01T15:01:00Z'),
        expiresAt: new Date('2026-09-01T15:10:00Z'),
      }),
    );
    expect(duplicate.id).toBe(first.id);
    const { calls, executor } = countingExecutor();
    const input = {
      commandId: first.id,
      now: new Date('2026-09-01T15:03:00Z'),
      commands: repository,
      devices: new MemoryDeviceRepository(targetDevice),
      policy: policy('ALLOW'),
      executor,
    } as const;

    await expect(processOfflineCommand(input)).resolves.toMatchObject({ status: 'APPLIED' });
    await expect(processOfflineCommand(input)).resolves.toMatchObject({ status: 'APPLIED' });
    expect(calls).toHaveLength(1);
  });
});
