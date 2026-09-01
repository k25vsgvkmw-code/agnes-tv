import type { LearnerId } from './types.js';

export interface StrokePoint {
  readonly x: number;
  readonly y: number;
}

export interface AnnotationStroke {
  readonly strokeId: string;
  readonly tool: 'pen' | 'highlighter' | 'circle' | 'drawing';
  readonly points: readonly StrokePoint[];
}

export interface PageInteractionState {
  readonly learnerId: LearnerId;
  readonly pageId: string;
  readonly strokes: readonly AnnotationStroke[];
  readonly typedAnswers: Record<string, string>;
  readonly selections: Record<string, string[]>;
  readonly dragDrop: Record<string, string>;
  readonly matching: Record<string, string>;
  readonly ordering: Record<string, string[]>;
  readonly numericAnswers: Record<string, number>;
  readonly completedActivityIds: readonly string[];
  readonly currentActivityId: string | null;
  readonly activityInProgress: boolean;
  readonly version: number;
  readonly updatedAt: string;
}

export function createEmptyPageState(learnerId: LearnerId, pageId: string): PageInteractionState {
  return {
    learnerId,
    pageId,
    strokes: [],
    typedAnswers: {},
    selections: {},
    dragDrop: {},
    matching: {},
    ordering: {},
    numericAnswers: {},
    completedActivityIds: [],
    currentActivityId: null,
    activityInProgress: false,
    version: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function clearLearnerLayer(state: PageInteractionState): PageInteractionState {
  return {
    ...state,
    strokes: [],
    typedAnswers: {},
    selections: {},
    dragDrop: {},
    matching: {},
    ordering: {},
    numericAnswers: {},
    completedActivityIds: [],
    currentActivityId: null,
    activityInProgress: false,
    updatedAt: new Date().toISOString(),
  };
}
