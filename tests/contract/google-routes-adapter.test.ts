import { afterEach, describe, expect, it, vi } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { GoogleRoutesAdapter } from '../../src/routing/google-routes-adapter.js';

const clock = new FixedClock(new Date('2026-09-01T15:00:00Z'));

function request() {
  return {
    origin: { latitude: 34.9, longitude: 33.6 },
    destination: { latitude: 34.92, longitude: 33.64 },
    mode: 'DRIVE' as const,
    departureAt: new Date('2026-09-01T15:30:00Z'),
  };
}

function providerPayload(duration = '1800s', staticDuration = '1500s') {
  return {
    routes: [
      {
        duration,
        staticDuration,
        distanceMeters: 12000,
      },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GoogleRoutesAdapter', () => {
  it('requests a traffic-aware driving route and normalizes it into canonical conditions', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(providerPayload()), { status: 200 }));
    const adapter = new GoogleRoutesAdapter({ apiKey: 'test-key', clock });

    const result = await adapter.getRoute(request());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': 'test-key',
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      origin: { location: { latLng: request().origin } },
      destination: { location: { latLng: request().destination } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      departureTime: '2026-09-01T15:30:00.000Z',
    });
    expect(result.durationMinutes).toBe(30);
    expect(result.distanceKm).toBe(12);
    expect(result.trafficDelayMinutes).toBe(5);
    expect(result.observedAt.toISOString()).toBe('2026-09-01T15:00:00.000Z');
    expect(result.expiresAt.toISOString()).toBe('2026-09-01T15:05:00.000Z');
    expect(result.source).toBe('google-routes');
    expect(result.confidence).toBe(0.9);
  });

  it('clamps traffic delay to zero when provider duration is below static duration', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(providerPayload('1200s', '1500s')), { status: 200 }),
    );
    const adapter = new GoogleRoutesAdapter({ apiKey: 'test-key', clock });

    await expect(adapter.getRoute(request())).resolves.toMatchObject({ trafficDelayMinutes: 0 });
  });

  it('throws ROUTING_PROVIDER_UNAVAILABLE when no API key is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const adapter = new GoogleRoutesAdapter({ apiKey: '', clock });

    await expect(adapter.getRoute(request())).rejects.toMatchObject({
      code: 'ROUTING_PROVIDER_UNAVAILABLE',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws ROUTING_PROVIDER_ERROR for provider or malformed response failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('unavailable', { status: 503 }),
    );
    const adapter = new GoogleRoutesAdapter({ apiKey: 'test-key', clock });

    await expect(adapter.getRoute(request())).rejects.toMatchObject({
      code: 'ROUTING_PROVIDER_ERROR',
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ routes: [{ duration: 'bad' }] }), { status: 200 }),
    );

    await expect(adapter.getRoute(request())).rejects.toMatchObject({
      code: 'ROUTING_PROVIDER_ERROR',
    });
  });
});
