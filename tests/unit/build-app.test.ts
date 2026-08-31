import { expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { FakeLocationSignalPort } from '../../src/location/fake-location-signal-port.js';
import { FakeRoutingPort } from '../../src/routing/fake-routing-port.js';
import { createTravelCondition } from '../../src/routing/travel-condition.js';
import { FakeWeatherPort } from '../../src/weather/fake-weather-port.js';
import { createWeatherSnapshot } from '../../src/weather/weather-snapshot.js';

it('builds the core application with AI unavailable', async () => {
  const app = await buildApp({
    databaseUrl: process.env.DATABASE_URL!,
    modelGateway: new UnavailableModelGateway(),
  });

  expect(app.modelGateway).toBeInstanceOf(UnavailableModelGateway);
  expect(app.connectorRegistry.get('test-calendar')).toBeDefined();
  expect(app.syncCalendar).toBeTypeOf('function');
  expect(app.suggestDepartureIfRisk).toBeTypeOf('function');
  expect(app.acknowledgeNotification).toBeTypeOf('function');

  await app.close();
});

it('exposes Live v2 services when provider-neutral Live dependencies are injected', async () => {
  const householdId = newHouseholdId();
  const weatherPort = new FakeWeatherPort(
    createWeatherSnapshot({
      householdId,
      placeId: 'home',
      observedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:20:00Z'),
      temperatureC: 29,
      feelsLikeC: 31,
      condition: 'rain',
      rainProbability: 0.8,
      precipitationMm: 1.2,
      windSpeedKmh: 18,
      windGustKmh: 27,
      humidity: 70,
      visibilityKm: 10,
      uvIndex: 2,
      source: 'fake-weather',
      confidence: 0.95,
    }),
  );
  const locationSignalPort = new FakeLocationSignalPort();
  const routingPort = new FakeRoutingPort(
    createTravelCondition({
      observedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:05:00Z'),
      durationMinutes: 25,
      distanceKm: 12,
      trafficDelayMinutes: 7,
      source: 'fake-routing',
      confidence: 0.94,
    }),
  );

  const app = await buildApp({
    databaseUrl: process.env.DATABASE_URL!,
    modelGateway: new UnavailableModelGateway(),
    weatherPort,
    locationSignalPort,
    routingPort,
  });

  expect(app.syncWeather).toBeTypeOf('function');
  expect(app.ingestLocationSignal).toBeTypeOf('function');
  expect(app.refreshRoute).toBeTypeOf('function');
  expect(app.evaluateDeparturePreparation).toBeTypeOf('function');
  expect(app.deviceRepository).toBeDefined();
  expect(app.pushTokenRepository).toBeDefined();
  expect(app.offlineCommandRepository).toBeDefined();
  expect(app.activeSituationStore).toBeDefined();

  await app.close();
});
