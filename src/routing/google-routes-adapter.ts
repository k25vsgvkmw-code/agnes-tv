import type { Clock } from '../kernel/clock.js';
import { AgnesError } from '../kernel/errors.js';
import type { RouteRequest, RoutingPort } from './routing-port.js';
import { createTravelCondition, type TravelCondition } from './travel-condition.js';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const FIELD_MASK = 'routes.duration,routes.staticDuration,routes.distanceMeters';

interface GoogleRoutesAdapterConfig {
  readonly apiKey: string;
  readonly clock: Clock;
}

interface GoogleRoutePayload {
  readonly routes?: readonly {
    readonly duration?: unknown;
    readonly staticDuration?: unknown;
    readonly distanceMeters?: unknown;
  }[];
}

function providerError(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): AgnesError {
  return new AgnesError('ROUTING_PROVIDER_ERROR', message, details);
}

function parseDurationSeconds(value: unknown, field: string): number {
  if (typeof value !== 'string') {
    throw providerError(`Malformed Google Routes field: ${field}`, { field });
  }

  const match = /^(\d+(?:\.\d+)?)s$/.exec(value);
  const seconds = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw providerError(`Malformed Google Routes field: ${field}`, { field, value });
  }

  return seconds;
}

function parseDistanceMeters(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw providerError('Malformed Google Routes field: routes.distanceMeters', {
      field: 'routes.distanceMeters',
      value,
    });
  }

  return value;
}

function requestBody(request: RouteRequest): Readonly<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    origin: { location: { latLng: request.origin } },
    destination: { location: { latLng: request.destination } },
    travelMode: request.mode,
    departureTime: request.departureAt.toISOString(),
  };

  if (request.mode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE';
  }

  return body;
}

export class GoogleRoutesAdapter implements RoutingPort {
  constructor(private readonly config: GoogleRoutesAdapterConfig) {}

  async getRoute(request: RouteRequest): Promise<TravelCondition> {
    if (this.config.apiKey.trim().length === 0) {
      throw new AgnesError(
        'ROUTING_PROVIDER_UNAVAILABLE',
        'Google Routes API key is not configured',
      );
    }

    let response: Response;
    try {
      response = await fetch(ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.config.apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(requestBody(request)),
      });
    } catch (error) {
      throw providerError('Google Routes request failed', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      throw providerError('Google Routes returned a non-success response', {
        status: response.status,
      });
    }

    let payload: GoogleRoutePayload;
    try {
      payload = (await response.json()) as GoogleRoutePayload;
    } catch {
      throw providerError('Google Routes returned invalid JSON');
    }

    const route = payload.routes?.[0];
    if (route === undefined) {
      throw providerError('Google Routes response is missing a route');
    }

    const durationSeconds = parseDurationSeconds(route.duration, 'routes.duration');
    const staticDurationSeconds = parseDurationSeconds(
      route.staticDuration,
      'routes.staticDuration',
    );
    const distanceMeters = parseDistanceMeters(route.distanceMeters);
    const observedAt = this.config.clock.now();

    return createTravelCondition({
      observedAt,
      expiresAt: new Date(observedAt.getTime() + 5 * 60 * 1000),
      durationMinutes: durationSeconds / 60,
      distanceKm: distanceMeters / 1000,
      trafficDelayMinutes: Math.max(0, durationSeconds - staticDurationSeconds) / 60,
      source: 'google-routes',
      confidence: 0.9,
    });
  }
}
