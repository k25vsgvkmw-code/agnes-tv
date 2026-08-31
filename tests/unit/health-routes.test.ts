import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerHealthRoutes } from '../../src/transport/health-routes.js';

describe('health routes', () => {
  it('returns ok without requiring external services', async () => {
    const app = Fastify();
    await registerHealthRoutes(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });

    await app.close();
  });
});
