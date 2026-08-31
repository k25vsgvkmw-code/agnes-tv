import { describe, expect, it } from 'vitest';
import { evaluateCapability } from '../../src/permissions/policy-engine.js';
import { scoreDecision } from '../../src/decisions/decision-score.js';
import { decideSituation } from '../../src/decisions/decide-situation.js';

describe('policy and decision engine', () => {
  it('allows suggestion while denying material action when act requires confirmation', () => {
    const policy = evaluateCapability({
      capability: 'calendar_changes',
      requested: 'act',
      grant: { view: true, suggest: true, act: 'requires_confirmation' },
    });

    expect(policy.allowed).toBe(false);
    expect(policy.requiresConfirmation).toBe(true);
    expect(
      evaluateCapability({
        capability: 'calendar_changes',
        requested: 'suggest',
        grant: { view: true, suggest: true, act: 'requires_confirmation' },
      }).allowed,
    ).toBe(true);
  });

  it('ranks urgent relevant high-confidence situations above low-confidence candidates', () => {
    const high = scoreDecision({
      relevance: 1,
      urgency: 1,
      impact: 0.8,
      confidence: 0.95,
      timingQuality: 0.9,
      interruptionCost: 0.2,
      repetitionPenalty: 0,
    });
    const low = scoreDecision({
      relevance: 1,
      urgency: 1,
      impact: 0.8,
      confidence: 0.3,
      timingQuality: 0.9,
      interruptionCost: 0.2,
      repetitionPenalty: 0,
    });

    expect(high).toBeGreaterThan(low);
  });

  it('suppresses non-urgent suggestions while sleeping', () => {
    expect(
      decideSituation({
        score: 0.72,
        urgency: 0.4,
        attentionState: 'sleeping',
        policyAllowsAct: false,
      }),
    ).toBe('ignore');
  });
});
