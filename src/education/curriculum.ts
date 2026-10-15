import type { ActivityKind, Grade, ValidationMode } from './types.js';

export interface SourceMetadata {
  readonly attribution: string;
  readonly sourceUrl: string;
  readonly resourceVersion?: string;
  readonly resourceDate?: string;
  readonly usageType: 'official-link' | 'official-embed' | 'agnes-authored';
}

export interface ActivityDefinition {
  readonly activityId: string;
  readonly kind: ActivityKind;
  readonly validationMode: ValidationMode;
  readonly prompt: string;
  readonly expected?: unknown;
}

export interface BaseContentReference {
  readonly type: 'source' | 'agnes';
  readonly ref: string;
}

export interface CurriculumPage {
  readonly pageId: string;
  readonly pageNumber: number;
  readonly title: string;
  readonly baseContent: BaseContentReference;
  readonly activities: readonly ActivityDefinition[];
}

export interface CurriculumResource {
  readonly resourceId: string;
  readonly grade: Grade;
  readonly subjectId: string;
  readonly subjectLabel: string;
  readonly title: string;
  readonly source: SourceMetadata;
  readonly pages: readonly CurriculumPage[];
}
