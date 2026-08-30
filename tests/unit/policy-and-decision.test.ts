import { describe, expect, it } from 'vitest';
import type { Situation } from '../../src/situations/situation.js';
import { evaluateCapability } from '../../src/permissions/policy-engine.js';
import { scoreDecision } from '../../src/decisions/decision-score.js';
import { decideSituation } from '../../src/decisions/decide-situation.js';

const grant = {
  view: true,
  suggest: true,
  act: 'requires_confirmation' as const,
};

function situation(confidence: number): Situation {
  return {
    type: 'LATE_DEPARTURE_RISK',
    confidence,
    detectedAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt: new Date('2026-09-01T15:30:00Z'),
    relatedEntities: [],
    supportingFactors: {},
  };
}

const signals = {
  relevance: 0.9,
  urgency: 0.9,
  impact: 0.8,
  timingQuality: 0.9,
  interruptionCost: 0.1,
  repetitionPenalty: 0,
};

describe('permission and decision gates', () => {
  it('allows suggestion while denying material action when CAN_ACT requires confirmation', () => {
    const suggestion = evaluateCapability({
      capability: 'calendar_changes',
      requested: 'suggest',
      grant,
    });
    const action = evaluateCapability({
      capability: 'calendar_changes',
      requested: 'act',
      grant,
    });

    expect(suggestion).toMatchObject({ allowed: true, requiresConfirmation: false });
    expect(action).toMatchObject({ allowed: false, requiresConfirmation: true });
  });

  it('ranks an equivalent high-confidence situation above a low-confidence candidate', () => {
    const highConfidence = scoreDecision({ ...signals, confidence: 0.95 });
    const lowConfidence = scoreDecision({ ...signals, confidence: 0.35 });

    expect(highConfidence).toBeGreaterThan(lowConfidence);
  });

  it('suppresses non-urgent suggestions while attention is sleeping', () => {
    const outcome = decideSituation({
      situation: situation(0.9),
      capability: 'calendar_changes',
      requested: 'suggest',
      grant,
      attentionState: 'sleeping',
      signals: {
        ...signals,
        urgency: 0.4,
      },
    });

    expect(outcome).toBe('ignore');
  });
});
