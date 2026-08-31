import { describe, expect, it } from 'vitest';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';

describe('UnavailableModelGateway', () => {
  it('returns a typed model-unavailable error without throwing', async () => {
    const gateway = new UnavailableModelGateway();
    const result = await gateway.extractIntent('what do we have today?');

    expect(result).toEqual({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
  });
});
