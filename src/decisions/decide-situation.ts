import type { Capability, CapabilityGrant } from '../permissions/capability.js';
import { evaluateCapability } from '../permissions/policy-engine.js';
import type { Situation } from '../situations/situation.js';
import {
  defaultDecisionScoreConfig,
  scoreDecision,
  type DecisionScoreConfig,
  type DecisionScoreInput,
} from './decision-score.js';

export type AttentionState =
  | 'available'
  | 'busy'
  | 'working'
  | 'driving'
  | 'sleeping'
  | 'focused'
  | 'unknown';

export type DecisionOutcome = 'ignore' | 'suggest' | 'prepare' | 'act';
export type RequestedDecisionOutcome = Exclude<DecisionOutcome, 'ignore'>;

export interface DecisionPolicyConfig {
  readonly minimumScore: number;
  readonly sleepingUrgencyBypass: number;
  readonly score: DecisionScoreConfig;
}

export const defaultDecisionPolicyConfig: DecisionPolicyConfig = {
  minimumScore: 0,
  sleepingUrgencyBypass: 0.9,
  score: defaultDecisionScoreConfig,
};

export interface DecideSituationInput {
  readonly situation: Situation;
  readonly capability: Capability;
  readonly requested: RequestedDecisionOutcome;
  readonly grant: CapabilityGrant;
  readonly attentionState: AttentionState;
  readonly signals: Omit<DecisionScoreInput, 'confidence'>;
  readonly config?: DecisionPolicyConfig;
}

export function decideSituation(input: DecideSituationInput): DecisionOutcome {
  const policy = evaluateCapability({
    capability: input.capability,
    requested: input.requested,
    grant: input.grant,
  });
  if (!policy.allowed) return 'ignore';

  const config = input.config ?? defaultDecisionPolicyConfig;
  if (input.attentionState === 'sleeping' && input.signals.urgency < config.sleepingUrgencyBypass) {
    return 'ignore';
  }

  const score = scoreDecision(
    {
      ...input.signals,
      confidence: input.situation.confidence,
    },
    config.score,
  );
  if (score < config.minimumScore) return 'ignore';

  return input.requested;
}
