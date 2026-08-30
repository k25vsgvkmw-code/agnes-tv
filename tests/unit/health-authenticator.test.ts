import { beforeEach, describe, expect, it } from 'vitest';
import type { HealthBridgeRegistration } from '../../src/health/health-bridge.js';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import {
  hashHealthBridgeToken,
  HealthBridgeAuthenticator,
} from '../../src/health/health-authenticator.js';
import type { HealthBridgeRepository } from '../../src/health/health-repositories.js';
import { HealthStatusService } from '../../src/health/health-status-service.js';
import { recordHealthHeartbeat } from '../../src/health/record-health-heartbeat.js';
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
      tokenHash: hashHealthBridgeToken('device-token-123'),
      allowedKinds: ['steps'],
      authState: 'active',
      lastHeartbeatAt: null,
      lastMeasurementAt: null,
      createdAt: new Date('2026-08-30T08:00:00Z'),
      updatedAt: new Date('2026-08-30T08:00:00Z'),
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

const now = new Date('2026-08-30T12:00:00Z');
let repository: MemoryBridgeRepository;
let authenticator: HealthBridgeAuthenticator;

beforeEach(() => {
  repository = new MemoryBridgeRepository();
  authenticator = new HealthBridgeAuthenticator(repository);
});

describe('HealthBridgeAuthenticator', () => {
  it('hashes bridge tokens with SHA-256 exactly', () => {
    expect(hashHealthBridgeToken('device-token-123')).toBe(
      '9ea4105ab67f32e1a1b93bca8904c57b14adef00149f6ef4b16c08df8b863855',
    );
  });

  it('authenticates by token hash without exposing the raw token', async () => {
    repository.seed();

    const bridge = await authenticator.authenticate('device-token-123');

    expect(bridge.id).toBe('bridge-1');
    expect(JSON.stringify(bridge)).not.toContain('device-token-123');
    expect(bridge.tokenHash).toBe(hashHealthBridgeToken('device-token-123'));
  });

  it.each(['expired', 'revoked'] as const)(
    'rejects %s bridge credentials with an expired-auth error',
    async (authState) => {
      repository.seed({
        tokenHash: hashHealthBridgeToken(authState),
        authState,
      });

      await expect(authenticator.authenticate(authState)).rejects.toMatchObject({
        code: 'HEALTH_AUTH_EXPIRED',
      });
    },
  );

  it('rejects an unknown token with a typed unauthorized error', async () => {
    await expect(authenticator.authenticate('unknown')).rejects.toMatchObject({
      code: 'HEALTH_AUTH_UNAUTHORIZED',
    });
  });

  it.each(['', '   '])('rejects empty token input before authentication', async (token) => {
    await expect(authenticator.authenticate(token)).rejects.toMatchObject({
      code: 'HEALTH_AUTH_UNAUTHORIZED',
    });
  });
});

describe('recordHealthHeartbeat', () => {
  it('updates heartbeat freshness only and cannot make health live', async () => {
    const bridge = repository.seed();
    const clock = new FixedClock(now);

    await recordHealthHeartbeat(bridge, { bridgeRepository: repository, clock });

    const updated = await repository.getById(bridge.id);
    expect(updated).toMatchObject({
      lastHeartbeatAt: now,
      lastMeasurementAt: null,
      updatedAt: now,
    });

    const status = await new HealthStatusService(repository, clock, defaultHealthConfig).getStatus(
      bridge.id,
    );
    expect(status.state).toBe('connected_no_data');
  });
});
