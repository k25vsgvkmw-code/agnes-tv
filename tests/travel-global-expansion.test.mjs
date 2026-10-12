import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GLOBAL_EXPANSION_JOURNEYS } from '../docs/travel/journeys-global-expansion.js';
import { DEPARTURE_PORTS } from '../docs/travel/journeys-data.js';

const modes = new Set(GLOBAL_EXPANSION_JOURNEYS.map((journey) => journey.mode));
const regions = new Set(GLOBAL_EXPANSION_JOURNEYS.map((journey) => journey.region));

test('global expansion adds substantial world coverage across every travel mode', () => {
  assert.ok(GLOBAL_EXPANSION_JOURNEYS.length >= 25);
  assert.deepEqual([...modes].sort(), ['air', 'rail', 'road', 'sea']);
  for (const region of [
    'Europe',
    'Asia',
    'Africa',
    'North America',
    'South America',
    'Oceania',
  ]) {
    assert.ok(regions.has(region), `missing region: ${region}`);
  }
});

test('global journey ids are unique and each journey has a usable route', () => {
  const ids = GLOBAL_EXPANSION_JOURNEYS.map((journey) => journey.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const journey of GLOBAL_EXPANSION_JOURNEYS) {
    assert.ok(journey.title);
    assert.ok(journey.subtitle);
    assert.ok(journey.route.stops.length >= 3);
    assert.ok(journey.bestMonths.length > 0 || journey.yearRound);
  }
});

test('global cruise departures point at supported departure ports', () => {
  const portIds = new Set(DEPARTURE_PORTS.map((port) => port.id));
  const cruises = GLOBAL_EXPANSION_JOURNEYS.filter((journey) => journey.type === 'cruise');
  assert.ok(cruises.length >= 6);
  for (const cruise of cruises) {
    assert.ok(portIds.has(cruise.cruise.departurePort));
    assert.ok(cruise.departurePorts.includes(cruise.cruise.departurePort));
    assert.ok(cruise.cruise.portsOfCall.length >= 3);
  }
});
