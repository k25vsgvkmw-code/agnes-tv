import Fastify, { type FastifyInstance } from 'fastify';
import { UnavailableModelGateway } from '../intelligence/unavailable-model-gateway.js';
import { SystemClock } from '../kernel/clock.js';
import { GoogleRoutesAdapter } from '../routing/google-routes-adapter.js';
import { registerHealthRoutes } from '../transport/health-routes.js';
import { OpenMeteoWeatherAdapter } from '../weather/open-meteo-weather-adapter.js';
import { buildApp } from './build-app.js';

const DEFAULT_OPEN_METEO_BASE_URL = 'https://api.open-meteo.com';

export async function buildServer(): Promise<FastifyInstance> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL is required');
  }

  const clock = new SystemClock();
  const weatherPort = new OpenMeteoWeatherAdapter(
    process.env.OPEN_METEO_BASE_URL?.trim() || DEFAULT_OPEN_METEO_BASE_URL,
  );
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const routingPort =
    googleMapsApiKey === undefined || googleMapsApiKey.length === 0
      ? undefined
      : new GoogleRoutesAdapter({ apiKey: googleMapsApiKey, clock });

  const core = await buildApp({
    databaseUrl,
    modelGateway: new UnavailableModelGateway(),
    clock,
    weatherPort,
    ...(routingPort === undefined ? {} : { routingPort }),
  });
  const app = Fastify();

  app.addHook('onClose', async () => {
    await core.close();
  });

  await registerHealthRoutes(app);
  return app;
}
