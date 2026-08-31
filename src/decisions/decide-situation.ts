export type DecisionOutcome = 'ignore' | 'suggest' | 'prepare' | 'act';
export type AttentionState = 'available' | 'busy' | 'sleeping';

export interface DecideSituationInput {
  readonly score: number;
  readonly urgency: number;
  readonly attentionState: AttentionState;
  readonly policyAllowsAct: boolean;
}

export function decideSituation(input: DecideSituationInput): DecisionOutcome {
  if (input.attentionState === 'sleeping' && input.urgency < 0.8) {
    return 'ignore';
  }

  if (input.score < 0.35) {
    return 'ignore';
  }

  if (input.score < 0.62) {
    return 'suggest';
  }

  if (input.score < 0.86 || !input.policyAllowsAct) {
    return input.score >= 0.75 ? 'prepare' : 'suggest';
  }

  return 'act';
}
