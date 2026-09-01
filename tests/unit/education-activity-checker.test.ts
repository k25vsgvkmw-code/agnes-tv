import { describe, expect, it } from 'vitest';
import { checkActivity } from '../../src/education/activity-checker.js';

describe('education activity checker', () => {
  it('checks exact numeric answers', () => {
    const result = checkActivity(
      {
        activityId: 'a1',
        kind: 'numeric',
        validationMode: 'exact',
        prompt: '24 + 13 =',
        expected: 37,
      },
      37,
    );
    expect(result).toEqual({ status: 'correct' });
  });

  it('normalizes strings for rule-based checks', () => {
    const result = checkActivity(
      {
        activityId: 'a2',
        kind: 'typed-text',
        validationMode: 'rule-based',
        prompt: 'Γράψε: Σχολείο',
        expected: 'σχολείο',
      },
      '  ΣΧΟΛΕΊΟ  ',
    );
    expect(result).toEqual({ status: 'correct' });
  });

  it('does not auto-grade manual activities', () => {
    const result = checkActivity(
      {
        activityId: 'a3',
        kind: 'drawing',
        validationMode: 'manual',
        prompt: 'Ζωγράφισε έναν κύκλο',
      },
      null,
    );
    expect(result).toEqual({ status: 'manual' });
  });
});
