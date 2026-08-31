import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/app/server.js';

const OPTIONAL_PROVIDER_ENV = [
  'GOOGLE_MAPS_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'OPENAI_API_KEY',
] as const;

const originalOptionalEnv = Object.fromEntries(
  OPTIONAL_PROVIDER_ENV.map((name) => [name, process.env[name]]),
);

afterEach(() => {
  for (const name of OPTIONAL_PROVIDER_ENV) {
    const value = originalOptionalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('server composition', () => {
  it('builds a Fastify server with health routes registered', async () => {
    const app = await buildServer();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('starts health successfully with all optional Live provider credentials absent', async () => {
    for (const name of OPTIONAL_PROVIDER_ENV) delete process.env[name];

    const app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
