import type { CapabilityEvaluationInput } from './capability.js';

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly requiresConfirmation: boolean;
}

export function evaluateCapability(input: CapabilityEvaluationInput): PolicyDecision {
  if (input.requested === 'view') {
    return { allowed: input.grant.view, requiresConfirmation: false };
  }

  if (input.requested === 'suggest') {
    return { allowed: input.grant.suggest, requiresConfirmation: false };
  }

  if (input.grant.act === 'requires_confirmation') {
    return { allowed: false, requiresConfirmation: true };
  }

  return {
    allowed: input.grant.act === 'allowed',
    requiresConfirmation: false,
  };
}
