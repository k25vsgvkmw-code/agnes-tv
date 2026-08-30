export interface DecisionScoreInput {
  readonly relevance: number;
  readonly urgency: number;
  readonly impact: number;
  readonly confidence: number;
  readonly timingQuality: number;
  readonly interruptionCost: number;
  readonly repetitionPenalty: number;
}

export interface DecisionScoreConfig {
  readonly positiveScale: number;
  readonly interruptionCostWeight: number;
  readonly repetitionPenaltyWeight: number;
}

export const defaultDecisionScoreConfig: DecisionScoreConfig = {
  positiveScale: 1,
  interruptionCostWeight: 0.35,
  repetitionPenaltyWeight: 0.25,
};

export function scoreDecision(
  input: DecisionScoreInput,
  config: DecisionScoreConfig = defaultDecisionScoreConfig,
): number {
  const positive =
    input.relevance *
    input.urgency *
    input.impact *
    input.confidence *
    input.timingQuality *
    config.positiveScale;

  return (
    positive -
    input.interruptionCost * config.interruptionCostWeight -
    input.repetitionPenalty * config.repetitionPenaltyWeight
  );
}
