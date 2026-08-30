import { err } from '../kernel/result.js';
import type {
  ConstrainedPlan,
  ExtractedIntent,
  GeneratedResponse,
  ModelError,
  ModelGateway,
} from './model-gateway.js';
import type { Result } from '../kernel/result.js';

const MODEL_UNAVAILABLE: ModelError = { code: 'MODEL_UNAVAILABLE' };

export class UnavailableModelGateway implements ModelGateway {
  async extractIntent(): Promise<Result<ExtractedIntent, ModelError>> {
    return err(MODEL_UNAVAILABLE);
  }

  async createPlan(): Promise<Result<ConstrainedPlan, ModelError>> {
    return err(MODEL_UNAVAILABLE);
  }

  async summarize(): Promise<Result<string, ModelError>> {
    return err(MODEL_UNAVAILABLE);
  }

  async generateResponse(): Promise<Result<GeneratedResponse, ModelError>> {
    return err(MODEL_UNAVAILABLE);
  }
}
