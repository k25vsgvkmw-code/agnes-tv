import type {
  Capability,
  CapabilityGrant,
  PolicyDecision,
  RequestedAutonomy,
} from './capability.js';

export interface EvaluateCapabilityInput {
  readonly capability: Capability;
  readonly requested: RequestedAutonomy;
  readonly grant: CapabilityGrant;
}

export function evaluateCapability(input: EvaluateCapabilityInput): PolicyDecision {
  if (input.requested === 'view') {
    return {
      capability: input.capability,
      requested: input.requested,
      allowed: input.grant.view,
      requiresConfirmation: false,
    };
  }

  if (input.requested === 'suggest' || input.requested === 'prepare') {
    return {
      capability: input.capability,
      requested: input.requested,
      allowed: input.grant.suggest,
      requiresConfirmation: false,
    };
  }

  if (input.grant.act === 'requires_confirmation') {
    return {
      capability: input.capability,
      requested: input.requested,
      allowed: false,
      requiresConfirmation: true,
    };
  }

  return {
    capability: input.capability,
    requested: input.requested,
    allowed: input.grant.act,
    requiresConfirmation: false,
  };
}
