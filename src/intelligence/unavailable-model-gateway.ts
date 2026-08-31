import { err, type Result } from '../kernel/result.js';
import type { IntentExtraction, ModelGateway, ModelGatewayError } from './model-gateway.js';

const unavailable = (): ModelGatewayError => ({ code: 'MODEL_UNAVAILABLE' });

export class UnavailableModelGateway implements ModelGateway {
  extractIntent(input: string): Promise<Result<IntentExtraction, ModelGatewayError>> {
    void input;
    return Promise.resolve(err(unavailable()));
  }

  plan(input: unknown): Promise<Result<unknown, ModelGatewayError>> {
    void input;
    return Promise.resolve(err(unavailable()));
  }

  summarize(input: string): Promise<Result<string, ModelGatewayError>> {
    void input;
    return Promise.resolve(err(unavailable()));
  }

  generateResponse(input: unknown): Promise<Result<string, ModelGatewayError>> {
    void input;
    return Promise.resolve(err(unavailable()));
  }
}
