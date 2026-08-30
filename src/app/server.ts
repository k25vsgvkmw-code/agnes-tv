import { buildApp } from './build-app.js';
import { serverConfigFromEnv } from './server-config.js';

const config = serverConfigFromEnv(process.env);
const app = await buildApp({
  databaseUrl: config.databaseUrl,
  healthBridgeId: config.healthBridgeId,
  healthConfig: config.healthConfig,
  logger: true,
});

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
