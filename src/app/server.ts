import { UnavailableModelGateway } from '../intelligence/unavailable-model-gateway.js';
import { buildApp } from './build-app.js';
import { createHttpApp } from './create-http-app.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const services = await buildApp({
    databaseUrl,
    modelGateway: new UnavailableModelGateway(),
  });
  const app = await createHttpApp(services, { logger: true });

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen({ host: '0.0.0.0', port });
}

void main();
