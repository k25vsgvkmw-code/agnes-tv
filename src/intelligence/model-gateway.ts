import type { Result } from '../kernel/result.js';

export interface ModelGatewayError {
  readonly code: 'MODEL_UNAVAILABLE' | 'MODEL_ERROR';
}

export interface IntentExtraction {
  readonly intent: string;
  readonly confidence: number;
}

export interface ModelGateway {
  extractIntent(input: string): Promise<Result<IntentExtraction, ModelGatewayError>>;
  plan(input: unknown): Promise<Result<unknown, ModelGatewayError>>;
  summarize(input: string): Promise<Result<string, ModelGatewayError>>;
  generateResponse(input: unknown): Promise<Result<string, ModelGatewayError>>;
}
