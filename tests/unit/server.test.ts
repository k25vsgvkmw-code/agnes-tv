import { describe, expect, it } from 'vitest';
import { buildServer } from '../../src/app/server.js';

describe('server composition', () => {
  it('builds a Fastify server with health routes registered', async () => {
    const app = await buildServer();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
