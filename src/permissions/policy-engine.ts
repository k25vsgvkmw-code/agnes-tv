import type { CapabilityRequest } from './capability.js';

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly requiresConfirmation: boolean;
  readonly capability: string;
}

export function evaluateCapability(request: CapabilityRequest): PolicyDecision {
  if (request.requested === 'view') {
    return {
      allowed: request.grant.view,
      requiresConfirmation: false,
      capability: request.capability,
    };
  }

  if (request.requested === 'suggest') {
    return {
      allowed: request.grant.suggest,
      requiresConfirmation: false,
      capability: request.capability,
    };
  }

  if (request.grant.act === 'requires_confirmation') {
    return { allowed: false, requiresConfirmation: true, capability: request.capability };
  }

  return {
    allowed: request.grant.act,
    requiresConfirmation: false,
    capability: request.capability,
  };
}
