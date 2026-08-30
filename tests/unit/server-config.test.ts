import { describe, expect, it } from 'vitest';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import { serverConfigFromEnv } from '../../src/app/server-config.js';

describe('serverConfigFromEnv', () => {
  it('builds server composition options from environment values', () => {
    expect(
      serverConfigFromEnv({
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/agnes',
        HEALTH_BRIDGE_ID: '81000000-0000-4000-8000-000000000003',
        PORT: '4100',
        HOST: '127.0.0.1',
        HEALTH_MEASUREMENT_FRESH_HOURS: '8',
      }),
    ).toEqual({
      databaseUrl: 'postgres://postgres:postgres@localhost:5432/agnes',
      healthBridgeId: '81000000-0000-4000-8000-000000000003',
      port: 4100,
      host: '127.0.0.1',
      healthConfig: {
        ...defaultHealthConfig,
        measurementFreshnessMs: 8 * 60 * 60 * 1000,
      },
    });
  });

  it('uses transport defaults when host and port are omitted', () => {
    expect(
      serverConfigFromEnv({
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/agnes',
        HEALTH_BRIDGE_ID: '81000000-0000-4000-8000-000000000003',
      }),
    ).toMatchObject({ port: 3000, host: '0.0.0.0' });
  });

  it.each(['DATABASE_URL', 'HEALTH_BRIDGE_ID'])('rejects missing %s', (name) => {
    const env = {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/agnes',
      HEALTH_BRIDGE_ID: '81000000-0000-4000-8000-000000000003',
    };
    delete env[name as keyof typeof env];

    expect(() => serverConfigFromEnv(env)).toThrow(`${name} is required`);
  });

  it.each(['0', '-1', '3.5', 'not-a-number'])('rejects invalid PORT=%s', (value) => {
    expect(() =>
      serverConfigFromEnv({
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/agnes',
        HEALTH_BRIDGE_ID: '81000000-0000-4000-8000-000000000003',
        PORT: value,
      }),
    ).toThrow('PORT must be a positive integer');
  });
});
