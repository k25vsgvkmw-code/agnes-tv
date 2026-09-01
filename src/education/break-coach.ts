export interface BreakPolicy {
  readonly minutesThreshold: number;
  readonly activityThreshold: number;
  readonly breakMinutes: number;
}

export interface BreakSessionInput {
  readonly uninterruptedMinutes: number;
  readonly completedActivities: number;
  readonly activityInProgress: boolean;
}

export type BreakSuggestion = 'water' | 'stretch' | 'eyes' | 'movement' | 'breathing';

export type BreakEvaluation =
  | { readonly action: 'none' }
  | { readonly action: 'defer' }
  | {
      readonly action: 'suggest';
      readonly suggestion: BreakSuggestion;
      readonly breakMinutes: number;
    };

const suggestions: readonly BreakSuggestion[] = [
  'water',
  'stretch',
  'eyes',
  'movement',
  'breathing',
];

export function evaluateBreak(
  session: BreakSessionInput,
  policy: BreakPolicy,
): BreakEvaluation {
  const isDue =
    session.uninterruptedMinutes >= policy.minutesThreshold ||
    session.completedActivities >= policy.activityThreshold;

  if (!isDue) {
    return { action: 'none' };
  }
  if (session.activityInProgress) {
    return { action: 'defer' };
  }

  const suggestion = suggestions[session.completedActivities % suggestions.length] ?? 'water';
  return { action: 'suggest', suggestion, breakMinutes: policy.breakMinutes };
}
