export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'ST';

export type LearnerId = 'vasilis' | 'elenios';

export type ActivityKind =
  | 'handwriting'
  | 'typed-text'
  | 'single-choice'
  | 'multiple-choice'
  | 'drag-drop'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'drawing'
  | 'read-aloud';

export type ValidationMode = 'manual' | 'exact' | 'rule-based' | 'guided';

export interface LearnerProfile {
  readonly learnerId: LearnerId;
  readonly displayName: string;
  readonly grade: Grade;
}
