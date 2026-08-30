import Fastify from 'fastify';
import { registerHealthRoutes } from '../transport/health-routes.js';

const app = Fastify({ logger: true });
await registerHealthRoutes(app);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
