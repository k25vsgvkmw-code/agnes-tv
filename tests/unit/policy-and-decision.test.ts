import { describe, expect, it } from 'vitest';
import { decideSituation } from '../../src/decisions/decide-situation.js';
import { scoreDecision } from '../../src/decisions/decision-score.js';
import { evaluateCapability } from '../../src/permissions/policy-engine.js';

describe('permission and decision policy', () => {
  it('allows suggestion while denying material action when CAN_ACT requires confirmation', () => {
    const policy = evaluateCapability({
      capability: 'calendar_changes',
      requested: 'act',
      grant: { view: true, suggest: true, act: 'requires_confirmation' },
    });

    expect(policy.allowed).toBe(false);
    expect(policy.requiresConfirmation).toBe(true);
  });

  it('ranks an otherwise equivalent high-confidence candidate above a low-confidence candidate', () => {
    const common = {
      relevance: 0.9,
      urgency: 0.9,
      impact: 0.7,
      timingQuality: 0.8,
      interruptionCost: 0.2,
      repetitionPenalty: 0.1,
    };

    const highConfidence = scoreDecision({ ...common, confidence: 0.95 });
    const lowConfidence = scoreDecision({ ...common, confidence: 0.4 });

    expect(highConfidence).toBeGreaterThan(lowConfidence);
  });

  it('suppresses non-urgent suggestions while attention state is sleeping', () => {
    const outcome = decideSituation({
      policy: { allowed: true, requiresConfirmation: false },
      requestedOutcome: 'suggest',
      attentionState: 'sleeping',
      urgency: 0.4,
      score: 0.9,
    });

    expect(outcome).toBe('ignore');
  });
});
