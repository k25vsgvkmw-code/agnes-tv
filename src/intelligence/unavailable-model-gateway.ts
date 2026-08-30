import type { Result } from '../kernel/result.js';
import { err } from '../kernel/result.js';
import type {
  ConstrainedPlan,
  ExtractedIntent,
  GeneratedResponse,
  ModelError,
  ModelGateway,
} from './model-gateway.js';

const MODEL_UNAVAILABLE: ModelError = { code: 'MODEL_UNAVAILABLE' };

export class UnavailableModelGateway implements ModelGateway {
  async extractIntent(input: string): Promise<Result<ExtractedIntent, ModelError>> {
    void input;
    return err(MODEL_UNAVAILABLE);
  }

  async createPlan(
    input: string,
    allowedActions: readonly string[],
  ): Promise<Result<ConstrainedPlan, ModelError>> {
    void input;
    void allowedActions;
    return err(MODEL_UNAVAILABLE);
  }

  async summarize(input: string): Promise<Result<string, ModelError>> {
    void input;
    return err(MODEL_UNAVAILABLE);
  }

  async generateResponse(input: string): Promise<Result<GeneratedResponse, ModelError>> {
    void input;
    return err(MODEL_UNAVAILABLE);
  }
}
