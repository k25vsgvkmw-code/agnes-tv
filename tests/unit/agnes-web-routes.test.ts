import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import {
  createFallbackFamilyOsSnapshot,
  type FamilyOsSnapshot,
} from '../../src/presentation/web/family-os-snapshot.js';
import { registerAgnesWebRoutes } from '../../src/transport/agnes-web-routes.js';

describe('AGNES web routes', () => {
  it('serves the Family OS shell as HTML', async () => {
    const app = Fastify();
    await registerAgnesWebRoutes(app, {
      snapshotFactory: () => createFallbackFamilyOsSnapshot(new Date('2026-09-05T06:58:00.000Z')),
    });

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('AGNES');
    expect(response.body).toContain('data-view="home"');

    await app.close();
  });

  it('serves the provider-neutral presentation snapshot as JSON', async () => {
    const app = Fastify();
    await registerAgnesWebRoutes(app);

    const response = await app.inject({ method: 'GET', url: '/ui/snapshot' });
    const snapshot = response.json<FamilyOsSnapshot>();

    expect(response.statusCode).toBe(200);
    expect(snapshot.exploreModules).toHaveLength(17);

    await app.close();
  });
});
