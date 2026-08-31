import { err, type Result } from '../kernel/result.js';
import type {
  IntentExtraction,
  ModelGateway,
  ModelGatewayError,
} from './model-gateway.js';

const unavailable = (): ModelGatewayError => ({ code: 'MODEL_UNAVAILABLE' });

export class UnavailableModelGateway implements ModelGateway {
  extractIntent(_input: string): Promise<Result<IntentExtraction, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }

  plan(_input: unknown): Promise<Result<unknown, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }

  summarize(_input: string): Promise<Result<string, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }

  generateResponse(_input: unknown): Promise<Result<string, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }
}
