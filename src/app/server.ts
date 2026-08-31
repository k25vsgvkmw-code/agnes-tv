import Fastify from 'fastify';
import { registerHealthRoutes } from '../transport/health-routes.js';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });
  await registerHealthRoutes(app);

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen({ host: '0.0.0.0', port });
}

void main();
