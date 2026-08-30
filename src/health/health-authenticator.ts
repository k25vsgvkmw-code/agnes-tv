import { createHash } from 'node:crypto';
import { AgnesError } from '../kernel/errors.js';
import type { HealthBridgeRegistration } from './health-bridge.js';
import type { HealthBridgeRepository } from './health-repositories.js';

export function hashHealthBridgeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class HealthBridgeAuthenticator {
  constructor(private readonly bridgeRepository: HealthBridgeRepository) {}

  async authenticate(token: string): Promise<HealthBridgeRegistration> {
    if (token.trim().length === 0) {
      throw new AgnesError('HEALTH_AUTH_UNAUTHORIZED', 'health bridge credential is required');
    }

    const bridge = await this.bridgeRepository.getByTokenHash(hashHealthBridgeToken(token));
    if (bridge === null) {
      throw new AgnesError('HEALTH_AUTH_UNAUTHORIZED', 'health bridge credential is invalid');
    }

    if (bridge.authState !== 'active') {
      throw new AgnesError('HEALTH_AUTH_EXPIRED', 'health bridge credential is not active');
    }

    return bridge;
  }
}
