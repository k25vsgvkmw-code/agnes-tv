import type { HealthConfig } from '../health/health-config.js';
import { healthConfigFromEnv, type Environment } from '../health/health-config-env.js';

export interface ServerConfig {
  readonly databaseUrl: string;
  readonly healthBridgeId: string;
  readonly port: number;
  readonly host: string;
  readonly healthConfig: HealthConfig;
}

function requireValue(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return 3000;

  const trimmed = raw.trim();
  const port = Number(trimmed);
  if (trimmed.length === 0 || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a positive integer');
  }

  return port;
}

export function serverConfigFromEnv(env: Environment): ServerConfig {
  return {
    databaseUrl: requireValue(env, 'DATABASE_URL'),
    healthBridgeId: requireValue(env, 'HEALTH_BRIDGE_ID'),
    port: parsePort(env.PORT),
    host: env.HOST?.trim() || '0.0.0.0',
    healthConfig: healthConfigFromEnv(env),
  };
}
