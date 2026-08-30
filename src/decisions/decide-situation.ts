import type { PolicyDecision } from '../permissions/policy-engine.js';

export type DecisionOutcome = 'ignore' | 'suggest' | 'prepare' | 'act';
export type AttentionState = 'available' | 'busy' | 'sleeping';

export interface DecideSituationInput {
  readonly policy: PolicyDecision;
  readonly requestedOutcome: Exclude<DecisionOutcome, 'ignore'>;
  readonly attentionState: AttentionState;
  readonly urgency: number;
  readonly score: number;
}

export function decideSituation(input: DecideSituationInput): DecisionOutcome {
  if (!input.policy.allowed) {
    return 'ignore';
  }

  if (input.attentionState === 'sleeping' && input.urgency < 0.8) {
    return 'ignore';
  }

  if (input.score < 0.5) {
    return 'ignore';
  }

  return input.requestedOutcome;
}
