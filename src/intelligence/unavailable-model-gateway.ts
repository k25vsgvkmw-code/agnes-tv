import { err, type Result } from '../kernel/result.js';
import type {
  IntentExtraction,
  ModelGateway,
  ModelGatewayError,
} from './model-gateway.js';

const unavailable = (): ModelGatewayError => ({ code: 'MODEL_UNAVAILABLE' });

export class UnavailableModelGateway implements ModelGateway {
  extractIntent(): Promise<Result<IntentExtraction, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }

  plan(): Promise<Result<unknown, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }

  summarize(): Promise<Result<string, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }

  generateResponse(): Promise<Result<string, ModelGatewayError>> {
    return Promise.resolve(err(unavailable()));
  }
}
