export interface DecisionScoreInput {
  readonly relevance: number;
  readonly urgency: number;
  readonly impact: number;
  readonly confidence: number;
  readonly timingQuality: number;
  readonly interruptionCost: number;
  readonly repetitionPenalty: number;
}

export interface DecisionScoreWeights {
  readonly relevance: number;
  readonly urgency: number;
  readonly impact: number;
  readonly confidence: number;
  readonly timingQuality: number;
  readonly interruptionCost: number;
  readonly repetitionPenalty: number;
}

export const DEFAULT_DECISION_SCORE_WEIGHTS: DecisionScoreWeights = {
  relevance: 0.22,
  urgency: 0.22,
  impact: 0.16,
  confidence: 0.16,
  timingQuality: 0.14,
  interruptionCost: 0.06,
  repetitionPenalty: 0.04,
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function scoreDecision(
  input: DecisionScoreInput,
  weights: DecisionScoreWeights = DEFAULT_DECISION_SCORE_WEIGHTS,
): number {
  const positive =
    clamp(input.relevance) * weights.relevance +
    clamp(input.urgency) * weights.urgency +
    clamp(input.impact) * weights.impact +
    clamp(input.confidence) * weights.confidence +
    clamp(input.timingQuality) * weights.timingQuality;
  const negative =
    clamp(input.interruptionCost) * weights.interruptionCost +
    clamp(input.repetitionPenalty) * weights.repetitionPenalty;

  return clamp(positive - negative);
}
