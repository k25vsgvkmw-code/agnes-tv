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
  readonly relevance: number;
  readonly urgency: number;
  readonly impact: number;
  readonly confidence: number;
  readonly timingQuality: number;
  readonly interruptionCost: number;
  readonly repetitionPenalty: number;
}

export const DEFAULT_DECISION_SCORE_CONFIG: DecisionScoreConfig = {
  relevance: 0.25,
  urgency: 0.25,
  impact: 0.15,
  confidence: 0.15,
  timingQuality: 0.1,
  interruptionCost: 0.05,
  repetitionPenalty: 0.05,
};

export function scoreDecision(
  input: DecisionScoreInput,
  config: DecisionScoreConfig = DEFAULT_DECISION_SCORE_CONFIG,
): number {
  return (
    input.relevance * config.relevance +
    input.urgency * config.urgency +
    input.impact * config.impact +
    input.confidence * config.confidence +
    input.timingQuality * config.timingQuality -
    input.interruptionCost * config.interruptionCost -
    input.repetitionPenalty * config.repetitionPenalty
  );
}
