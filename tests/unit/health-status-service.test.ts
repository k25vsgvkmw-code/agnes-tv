import { beforeEach, describe, expect, it } from 'vitest';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import type { HealthBridgeRegistration } from '../../src/health/health-bridge.js';
import type { HealthBridgeRepository } from '../../src/health/health-repositories.js';
import { HealthStatusService } from '../../src/health/health-status-service.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type { HouseholdId, PersonId } from '../../src/kernel/ids.js';

class MemoryBridgeRepository implements HealthBridgeRepository {
  private readonly bridges = new Map<string, HealthBridgeRegistration>();

  seed(overrides: Partial<HealthBridgeRegistration> = {}): HealthBridgeRegistration {
    const bridge: HealthBridgeRegistration = {
      id: 'bridge-1',
      householdId: 'household-1' as HouseholdId,
      personId: 'person-1' as PersonId,
      provider: 'health_connect',
      sourceDeviceId: 'pixel-1',
      tokenHash: 'token-hash',
      allowedKinds: ['steps', 'heart_rate', 'sleep', 'weight', 'active_energy'],
      authState: 'active',
      lastHeartbeatAt: null,
      lastMeasurementAt: null,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    };
    this.bridges.set(bridge.id, bridge);
    return bridge;
  }

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
    if (bridge !== undefined)
      this.bridges.set(id, { ...bridge, lastHeartbeatAt: at, updatedAt: at });
  }

  async recordMeasurementSeen(id: string, at: Date): Promise<void> {
    const bridge = this.bridges.get(id);
    if (bridge !== undefined)
      this.bridges.set(id, { ...bridge, lastMeasurementAt: at, updatedAt: at });
  }
}

const now = new Date('2026-08-30T12:00:00Z');
let bridgeRepo: MemoryBridgeRepository;
let service: HealthStatusService;

beforeEach(() => {
  bridgeRepo = new MemoryBridgeRepository();
  service = new HealthStatusService(bridgeRepo, new FixedClock(now), defaultHealthConfig);
});

describe('HealthStatusService', () => {
  it('returns disconnected for an unknown bridge', async () => {
    expect(await service.getStatus('missing')).toEqual({
      state: 'disconnected',
      lastHeartbeatAt: null,
      lastMeasurementAt: null,
      evaluatedAt: now,
    });
  });

  it.each(['expired', 'revoked'] as const)(
    'returns auth_expired for %s auth',
    async (authState) => {
      bridgeRepo.seed({
        authState,
        lastHeartbeatAt: new Date('2026-08-30T11:30:00Z'),
        lastMeasurementAt: new Date('2026-08-30T11:45:00Z'),
      });

      expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'auth_expired' });
    },
  );

  it('returns live when a valid measurement is fresh', async () => {
    bridgeRepo.seed({
      lastHeartbeatAt: new Date('2026-08-30T01:00:00Z'),
      lastMeasurementAt: new Date('2026-08-30T10:30:00Z'),
    });

    expect(await service.getStatus('bridge-1')).toMatchObject({
      state: 'live',
      lastHeartbeatAt: new Date('2026-08-30T01:00:00Z'),
      lastMeasurementAt: new Date('2026-08-30T10:30:00Z'),
      evaluatedAt: now,
    });
  });

  it('returns connected_no_data for a recent heartbeat without a fresh measurement', async () => {
    bridgeRepo.seed({
      lastHeartbeatAt: new Date('2026-08-30T11:00:00Z'),
      lastMeasurementAt: null,
    });

    expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'connected_no_data' });
  });

  it('returns connected_no_data when recent activity exists but the measurement is stale', async () => {
    bridgeRepo.seed({
      lastHeartbeatAt: new Date('2026-08-30T10:00:00Z'),
      lastMeasurementAt: new Date('2026-08-29T10:00:00Z'),
    });

    expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'connected_no_data' });
  });

  it('returns degraded when last activity is older than heartbeat freshness but within grace', async () => {
    bridgeRepo.seed({
      lastHeartbeatAt: new Date('2026-08-30T05:00:00Z'),
      lastMeasurementAt: null,
    });

    expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'degraded' });
  });

  it('returns disconnected when last activity is older than degraded grace', async () => {
    bridgeRepo.seed({
      lastHeartbeatAt: new Date('2026-08-28T10:00:00Z'),
      lastMeasurementAt: null,
    });

    expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'disconnected' });
  });
});
