import { describe, expect, it } from 'vitest';
import { evaluateBreak } from '../../src/education/break-coach.js';

describe('puppy break coach', () => {
  const policy = { minutesThreshold: 20, activityThreshold: 3, breakMinutes: 5 };

  it('defers a due break while an activity is in progress', () => {
    expect(
      evaluateBreak(
        { uninterruptedMinutes: 25, completedActivities: 4, activityInProgress: true },
        policy,
      ),
    ).toEqual({ action: 'defer' });
  });

  it('suggests a break at an activity boundary after threshold', () => {
    const result = evaluateBreak(
      { uninterruptedMinutes: 25, completedActivities: 4, activityInProgress: false },
      policy,
    );
    expect(result.action).toBe('suggest');
    if (result.action === 'suggest') {
      expect(result.breakMinutes).toBe(5);
      expect(['water', 'stretch', 'eyes', 'movement', 'breathing']).toContain(result.suggestion);
    }
  });

  it('does nothing before either threshold is reached', () => {
    expect(
      evaluateBreak(
        { uninterruptedMinutes: 8, completedActivities: 1, activityInProgress: false },
        policy,
      ),
    ).toEqual({ action: 'none' });
  });
});
