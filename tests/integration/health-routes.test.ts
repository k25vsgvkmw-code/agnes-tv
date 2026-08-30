import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuditRecord, AuditRepository } from '../../src/audit/audit-record.js';
import type { AgnesEvent } from '../../src/events/agnes-event.js';
import type { OutboxRecord, OutboxRepository } from '../../src/events/outbox.js';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import {
  hashHealthBridgeToken,
  HealthBridgeAuthenticator,
} from '../../src/health/health-authenticator.js';
import type { HealthBridgeRegistration } from '../../src/health/health-bridge.js';
import type { HealthMeasurement, RawHealthMeasurement } from '../../src/health/health-measurement.js';
import type {
  HealthBridgeRepository,
  HealthMeasurementRepository,
} from '../../src/health/health-repositories.js';
import { importHealthMeasurement } from '../../src/health/import-health-measurement.js';
import { recordHealthHeartbeat } from '../../src/health/record-health-heartbeat.js';
import { HealthStatusService } from '../../src/health/health-status-service.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type { EventId, HouseholdId, PersonId } from '../../src/kernel/ids.js';
import { registerHealthRoutes } from '../../src/transport/health-routes.js';

class MemoryBridgeRepository implements HealthBridgeRepository {
  private readonly bridges = new Map<string, HealthBridgeRegistration>();

  async getById(id: string): Promise<HealthBridgeRegistration | null> {
    return this.bridges.get(id) ?? null;
  }

  async getByTokenHash(tokenHash: string): Promise<HealthBridgeRegistration | null> {
    return [...this.bridges.values()].find((bridge) => bridge.tokenHash === tokenHash) ?? null;
  }

  async save(bridge: HealthBridgeRegistration): Promise<void> {
    this.bridges.set(bridge.id, bridge);
  }

  async recordHeartbeat(id: string, at: Date): Promise<void> {
    const bridge = this.bridges.get(id);
    if (bridge !== undefined) {
      this.bridges.set(id, { ...bridge, lastHeartbeatAt: at, updatedAt: at });
    }
  }

  async recordMeasurementSeen(id: string, at: Date): Promise<void> {
    const bridge = this.bridges.get(id);
    if (bridge !== undefined) {
      this.bridges.set(id, { ...bridge, lastMeasurementAt: at, updatedAt: at });
    }
  }
}

class MemoryMeasurementRepository implements HealthMeasurementRepository {
  private readonly measurements = new Map<string, HealthMeasurement>();

  get size(): number {
    return this.measurements.size;
  }

  async insertIfAbsent(measurement: HealthMeasurement) {
    const existing = this.measurements.get(measurement.dedupeKey);
    if (existing !== undefined) {
      return { measurement: existing, change: 'unchanged' as const };
    }

    this.measurements.set(measurement.dedupeKey, measurement);
    return { measurement, change: 'created' as const };
  }

  async getLatestMeasuredAt(): Promise<Date | null> {
    const latest = [...this.measurements.values()].reduce<Date | null>((current, measurement) => {
      if (current === null || measurement.measuredAt.getTime() > current.getTime()) {
        return measurement.measuredAt;
      }
      return current;
    }, null);
    return latest;
  }
}

class MemoryOutboxRepository implements OutboxRepository {
  private readonly records = new Map<EventId, OutboxRecord>();

  async append(event: AgnesEvent): Promise<void> {
    this.records.set(event.id, {
      event,
      createdAt: event.receivedAt,
      publishedAt: null,
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    });
  }

  async get(eventId: EventId): Promise<OutboxRecord | null> {
    return this.records.get(eventId) ?? null;
  }

  async claimPending(limit: number): Promise<readonly OutboxRecord[]> {
    return [...this.records.values()].slice(0, limit);
  }

  async markPublished(eventId: EventId, publishedAt: Date): Promise<void> {
    const record = this.records.get(eventId);
    if (record !== undefined) {
      this.records.set(eventId, { ...record, publishedAt });
    }
  }

  async markFailed(eventId: EventId, error: string, nextAttemptAt: Date): Promise<void> {
    const record = this.records.get(eventId);
    if (record !== undefined) {
      this.records.set(eventId, {
        ...record,
        attempts: record.attempts + 1,
        lastError: error,
        nextAttemptAt,
      });
    }
  }
}

class MemoryAuditRepository implements AuditRepository {
  readonly records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.records.push(record);
  }
}

const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));
const householdId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as HouseholdId;
const personId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as PersonId;
const bridgeId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const token = 'device-token-123';

const bridge: HealthBridgeRegistration = {
  id: bridgeId,
  householdId,
  personId,
  provider: 'health_connect',
  sourceDeviceId: 'pixel-route-test',
  tokenHash: hashHealthBridgeToken(token),
  allowedKinds: ['steps'],
  authState: 'active',
  lastHeartbeatAt: null,
  lastMeasurementAt: null,
  createdAt: new Date('2026-08-30T08:00:00Z'),
  updatedAt: new Date('2026-08-30T08:00:00Z'),
};

const measurement: RawHealthMeasurement = {
  kind: 'steps',
  value: 8432,
  unit: 'count',
  measuredAt: '2026-08-30T10:00:00Z',
  externalId: 'route-steps-1',
};

let app: FastifyInstance;
let bridgeRepository: MemoryBridgeRepository;
let measurementRepository: MemoryMeasurementRepository;

function authorization(value = token): Record<string, string> {
  return { authorization: `Bearer ${value}` };
}

async function buildTestApp(): Promise<FastifyInstance> {
  const outboxRepository = new MemoryOutboxRepository();
  const auditRepository = new MemoryAuditRepository();
  const authenticator = new HealthBridgeAuthenticator(bridgeRepository);
  const statusService = new HealthStatusService(bridgeRepository, clock, defaultHealthConfig);
  const instance = Fastify();

  await registerHealthRoutes(instance, {
    authenticator,
    statusService,
    recordHeartbeat: (registration) =>
      recordHealthHeartbeat(registration, { bridgeRepository, clock }),
    importMeasurement: (raw, registration, correlationId) =>
      importHealthMeasurement(raw, registration, {
        measurementRepository,
        bridgeRepository,
        outboxRepository,
        auditRepository,
        clock,
        config: defaultHealthConfig,
        correlationId,
        runInTransaction: async (operation) => operation(undefined as never),
      }),
  });
  await instance.ready();
  return instance;
}

beforeEach(async () => {
  bridgeRepository = new MemoryBridgeRepository();
  measurementRepository = new MemoryMeasurementRepository();
  await bridgeRepository.save(bridge);
  app = await buildTestApp();
});

afterEach(async () => {
  await app.close();
});

describe('Fastify health integration routes', () => {
  it('reports connected_no_data after an authenticated heartbeat with no measurement', async () => {
    const heartbeat = await app.inject({
      method: 'POST',
      url: '/integrations/health/heartbeat',
      headers: authorization(),
    });
    expect(heartbeat.statusCode).toBe(204);
    expect(heartbeat.body).toBe('');

    const status = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization(),
    });

    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      state: 'connected_no_data',
      lastHeartbeatAt: '2026-08-30T12:00:00.000Z',
      lastMeasurementAt: null,
      evaluatedAt: '2026-08-30T12:00:00.000Z',
    });
    expect(status.body).not.toContain(token);
    expect(status.body).not.toContain('value');
  });

  it('returns 401 for missing and unknown bearer credentials', async () => {
    const missing = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toMatchObject({
      error: { code: 'HEALTH_AUTH_UNAUTHORIZED' },
    });

    const unknown = await app.inject({
      method: 'POST',
      url: '/integrations/health/heartbeat',
      headers: authorization('wrong-token'),
    });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json()).toMatchObject({
      error: { code: 'HEALTH_AUTH_UNAUTHORIZED' },
    });
    expect(unknown.body).not.toContain('wrong-token');
  });

  it('returns 401 for an expired bridge credential', async () => {
    await bridgeRepository.save({ ...bridge, authState: 'expired' });

    const response = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'HEALTH_AUTH_EXPIRED' },
    });
  });

  it('returns 201 for a new valid measurement and changes status to live', async () => {
    const imported = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: measurement,
    });

    expect(imported.statusCode).toBe(201);
    expect(imported.json()).toMatchObject({ change: 'created' });
    expect(imported.json().id).toMatch(/^[0-9a-f-]{36}$/);
    expect(imported.body).not.toContain('8432');

    const status = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization(),
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      state: 'live',
      lastMeasurementAt: '2026-08-30T10:00:00.000Z',
    });
  });

  it('returns the existing id with unchanged when an identical measurement is retried', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: measurement,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: measurement,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ id: first.json().id, change: 'unchanged' });
    expect(measurementRepository.size).toBe(1);
  });

  it('returns 400 for a measurement with an invalid unit pairing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: { ...measurement, unit: 'kg' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(response.body).not.toContain('8432');
  });

  it('rejects ownership and source fields supplied by the HTTP caller', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: {
        ...measurement,
        householdId: 'attacker-household',
        personId: 'attacker-person',
        provider: 'healthkit',
        sourceDeviceId: 'attacker-device',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(measurementRepository.size).toBe(0);
  });
});
