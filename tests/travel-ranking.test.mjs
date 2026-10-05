import test from 'node:test';
import assert from 'node:assert/strict';
import { rankDestinations } from '../docs/travel/ranking.js';

const sample = [
  { name: 'Venice', access: 'direct', baseScore: 95, tripTypes: ['City', 'Couple'], liveFareEur: 111 },
  { name: 'Innsbruck', access: '1_stop', baseScore: 96, tripTypes: ['Ski', 'Alps'], liveFareEur: null },
  { name: 'Athens', access: 'direct', baseScore: 97, tripTypes: ['City', 'Family'], liveFareEur: null },
];

test('directOnly removes one-stop destinations', () => {
  const ranked = rankDestinations(sample, { directOnly: true });
  assert.equal(ranked.some((d) => d.access !== 'direct'), false);
});

test('trip type preference lifts matching destinations', () => {
  const ranked = rankDestinations(sample, { tripType: 'Ski' });
  assert.equal(ranked[0].name, 'Innsbruck');
});

test('maxFare rewards matching live fare and Venice ranks first', () => {
  const ranked = rankDestinations(sample, { maxFare: 150 });
  assert.equal(ranked[0].name, 'Venice');
  assert.ok(ranked[0].score > 100);
});
