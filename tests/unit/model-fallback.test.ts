import { expect, it } from 'vitest';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';

it('returns a typed unavailable result instead of throwing through core workflows', async () => {
  const gateway = new UnavailableModelGateway();
  const result = await gateway.extractIntent('what do we have today?');

  expect(result).toEqual({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
});
