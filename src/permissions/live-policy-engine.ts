import {
  meetsAuthenticationStrength,
  type AuthenticationStrength,
} from '../authentication/authentication-strength.js';
import type { Device } from '../devices/device.js';
import type { CapabilityGrant, CapabilityRequest } from './capability.js';
import { namedCapabilityPolicy, type NamedCapability } from './named-capability.js';
import { evaluateCapability } from './policy-engine.js';

export type LivePolicyResult = 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION' | 'REQUIRE_STRONG_AUTH';
export type LiveSessionScope = 'PERSONAL' | 'HOUSEHOLD_SHARED';
export type LiveResourcePrivacy = 'HOUSEHOLD' | 'PRIVATE';

export interface LivePolicyInput {
  readonly capability: NamedCapability;
  readonly requested: CapabilityRequest;
  readonly grant: CapabilityGrant;
  readonly authenticationStrength: AuthenticationStrength;
  readonly device: Device;
  readonly sessionScope: LiveSessionScope;
  readonly resourcePrivacy: LiveResourcePrivacy;
}

function isSharedDevice(device: Device): boolean {
  return device.ownerPersonId === undefined;
}

export function evaluateLivePolicy(input: LivePolicyInput): LivePolicyResult {
  if (input.device.revokedAt !== undefined) return 'DENY';

  if (input.resourcePrivacy === 'PRIVATE' && input.sessionScope === 'HOUSEHOLD_SHARED') {
    return 'DENY';
  }

  const capabilityPolicy = namedCapabilityPolicy(input.capability);
  if (
    capabilityPolicy.protectedOnSharedDevice &&
    isSharedDevice(input.device) &&
    input.device.trustLevel === 'UNTRUSTED'
  ) {
    return 'DENY';
  }

  const baseDecision = evaluateCapability({
    capability: input.capability,
    requested: input.requested,
    grant: input.grant,
  });

  if (baseDecision.requiresConfirmation) return 'REQUIRE_CONFIRMATION';
  if (!baseDecision.allowed) return 'DENY';

  if (
    !meetsAuthenticationStrength(
      input.authenticationStrength,
      capabilityPolicy.minimumAuthenticationStrength,
    )
  ) {
    return 'REQUIRE_STRONG_AUTH';
  }

  return 'ALLOW';
}
