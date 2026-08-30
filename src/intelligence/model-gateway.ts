import type { Result } from '../kernel/result.js';

export interface ModelUnavailableError {
  readonly code: 'MODEL_UNAVAILABLE';
}

export type ModelError = ModelUnavailableError;

export interface ExtractedIntent {
  readonly intent: string;
  readonly confidence: number;
  readonly entities: Readonly<Record<string, string>>;
}

export interface PlannedStep {
  readonly action: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface ConstrainedPlan {
  readonly steps: readonly PlannedStep[];
}

export interface GeneratedResponse {
  readonly text: string;
}

export interface ModelGateway {
  extractIntent(input: string): Promise<Result<ExtractedIntent, ModelError>>;
  createPlan(
    input: string,
    allowedActions: readonly string[],
  ): Promise<Result<ConstrainedPlan, ModelError>>;
  summarize(input: string): Promise<Result<string, ModelError>>;
  generateResponse(input: string): Promise<Result<GeneratedResponse, ModelError>>;
}
