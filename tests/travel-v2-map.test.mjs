import { describe, expect, it } from 'vitest';
import { buildRouteModel, renderJourneyMap } from '../docs/travel/map-render.js';

describe('AGNES World V2 route map', () => {
  it('builds ordered clickable stops and highlights the current chapter', () => {
    const journey = {
      id: 'route-a',
      route: {
        stops: [
          { id: 'a', name: 'Athens', lat: 37.98, lng: 23.72 },
          { id: 'b', name: 'Meteora', lat: 39.72, lng: 21.63 },
        ],
      },
    };
    const model = buildRouteModel(journey, { currentStopId: 'b' });
    expect(model.stops.map((stop) => stop.name)).toEqual(['Athens', 'Meteora']);
    expect(model.stops[1].current).toBe(true);
  });

  it('renders SVG when coordinates exist', () => {
    const journey = {
      id: 'route-svg',
      route: {
        stops: [
          { id: 'a', name: 'A', lat: 1, lng: 1 },
          { id: 'b', name: 'B', lat: 2, lng: 2 },
        ],
      },
    };
    const html = renderJourneyMap(journey);
    expect(html).toContain('<svg');
    expect(html).toContain('data-route-stop="a"');
  });

  it('falls back to an accessible DOM route when coordinates are missing', () => {
    const journey = {
      id: 'route-text',
      route: {
        stops: [
          { id: 'a', name: 'Athens' },
          { id: 'b', name: 'Nafplio' },
        ],
      },
    };
    const html = renderJourneyMap(journey);
    expect(html).not.toContain('<svg');
    expect(html).toContain('aria-label="Journey route"');
    expect(html).toContain('Athens');
    expect(html).toContain('Nafplio');
  });
});
