import type { ActivityDefinition } from './curriculum.js';

export type ActivityCheckStatus = 'correct' | 'incorrect' | 'manual' | 'guided';

export interface ActivityCheckResult {
  readonly status: ActivityCheckStatus;
}

function normalizeRuleValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim().toLocaleLowerCase('el-GR');
  }
  if (typeof value === 'number') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeRuleValue);
  }
  return value;
}

function equals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function checkActivity(
  activity: ActivityDefinition,
  answer: unknown,
): ActivityCheckResult {
  if (activity.validationMode === 'manual') {
    return { status: 'manual' };
  }
  if (activity.validationMode === 'guided') {
    return { status: 'guided' };
  }

  const actual =
    activity.validationMode === 'rule-based' ? normalizeRuleValue(answer) : answer;
  const expected =
    activity.validationMode === 'rule-based'
      ? normalizeRuleValue(activity.expected)
      : activity.expected;

  return { status: equals(actual, expected) ? 'correct' : 'incorrect' };
}
