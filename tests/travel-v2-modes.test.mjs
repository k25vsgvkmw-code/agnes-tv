import { describe, expect, it } from 'vitest';
import { renderRailLanding } from '../docs/travel/rail-render.js';
import { renderRoadLanding } from '../docs/travel/road-render.js';
import { renderAirLanding } from '../docs/travel/air-render.js';
import { filterCruises } from '../docs/travel/cruise-render.js';

const journeys = [
  {
    id: 'rail-a',
    mode: 'rail',
    type: 'rail-journey',
    title: 'Alpine Rail',
    subtitle: 'Scenic rail',
    region: 'Europe',
    originIds: ['station-zurich'],
    rail: { serviceType: 'scenic' },
    hero: {},
  },
  {
    id: 'road-a',
    mode: 'road',
    type: 'road-trip',
    title: 'Road Escape',
    subtitle: 'Open road',
    region: 'Europe',
    road: { drivingIntensity: 'easy', camperFriendly: true },
    hero: {},
  },
  {
    id: 'air-a',
    mode: 'air',
    type: 'flight-escape',
    title: 'City Escape',
    subtitle: 'Fly in',
    region: 'Asia',
    originIds: ['airport-larnaca'],
    durationDays: 6,
    hero: {},
  },
  {
    id: 'sea-a',
    mode: 'sea',
    type: 'cruise',
    title: 'Aegean Cruise',
    subtitle: 'By sea',
    region: 'Greece',
    departurePorts: ['limassol'],
    bestMonths: [10],
    cruise: { departurePort: 'limassol' },
    hero: {},
  },
];

const state = { month: 10, region: '', agnesHistory: [] };

describe('AGNES World V2 mode discovery', () => {
  it('renders rail origin and service-type controls', () => {
    const html = renderRailLanding(journeys, {
      ...state,
      originId: 'station-zurich',
      railStyle: 'scenic',
    });
    expect(html).toContain('station-zurich');
    expect(html).toContain('scenic');
    expect(html).toContain('Alpine Rail');
  });

  it('renders road driving-intensity and camper controls', () => {
    const html = renderRoadLanding(journeys, {
      ...state,
      roadStyle: 'easy',
      camper: true,
    });
    expect(html).toContain('Driving intensity');
    expect(html).toContain('Camper-friendly');
    expect(html).toContain('Road Escape');
  });

  it('renders air origin and trip-length controls', () => {
    const html = renderAirLanding(journeys, {
      ...state,
      originId: 'airport-larnaca',
      durationDays: 6,
    });
    expect(html).toContain('airport-larnaca');
    expect(html).toContain('Trip length');
    expect(html).toContain('City Escape');
  });

  it('keeps cruises departure-port and month aware', () => {
    const filtered = filterCruises(journeys, {
      ...state,
      departurePort: 'limassol',
    });
    expect(filtered.map((journey) => journey.id)).toEqual(['sea-a']);
  });
});
