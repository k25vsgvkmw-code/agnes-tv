import Fastify from 'fastify';
import { UnavailableModelGateway } from '../intelligence/unavailable-model-gateway.js';
import { registerAgnesWebRoutes } from '../transport/agnes-web-routes.js';
import { registerHealthRoutes } from '../transport/health-routes.js';
import { buildApp } from './build-app.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const services = await buildApp({
    databaseUrl,
    modelGateway: new UnavailableModelGateway(),
  });
  const app = Fastify({ logger: true });
  app.addHook('onClose', () => services.close());
  await registerHealthRoutes(app);
  await registerAgnesWebRoutes(app);

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen({ host: '0.0.0.0', port });
}

void main();
