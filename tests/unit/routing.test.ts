import { describe, expect, it } from 'vitest';
import { FakeRoutingPort } from '../../src/routing/fake-routing-port.js';
import { createTravelCondition } from '../../src/routing/travel-condition.js';

function validTravelConditionInput() {
  return {
    observedAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt: new Date('2026-09-01T15:05:00Z'),
    durationMinutes: 25,
    distanceKm: 18,
    trafficDelayMinutes: 7,
    source: 'fake-routing',
    confidence: 0.9,
  } as const;
}

describe('canonical travel conditions', () => {
  it('accepts non-negative duration distance and traffic delay', () => {
    const condition = createTravelCondition(validTravelConditionInput());

    expect(condition.durationMinutes).toBe(25);
    expect(condition.distanceKm).toBe(18);
    expect(condition.trafficDelayMinutes).toBe(7);
  });

  it('rejects negative duration distance or traffic delay', () => {
    expect(() =>
      createTravelCondition({ ...validTravelConditionInput(), durationMinutes: -1 }),
    ).toThrow('durationMinutes');
    expect(() => createTravelCondition({ ...validTravelConditionInput(), distanceKm: -1 })).toThrow(
      'distanceKm',
    );
    expect(() =>
      createTravelCondition({ ...validTravelConditionInput(), trafficDelayMinutes: -1 }),
    ).toThrow('trafficDelayMinutes');
  });

  it('requires confidence between zero and one', () => {
    expect(() =>
      createTravelCondition({ ...validTravelConditionInput(), confidence: 1.1 }),
    ).toThrow('confidence');
  });

  it('requires expiry after observation', () => {
    expect(() =>
      createTravelCondition({
        ...validTravelConditionInput(),
        expiresAt: new Date('2026-09-01T15:00:00Z'),
      }),
    ).toThrow('expiresAt');
  });

  it('returns a deterministic route and records the request in the fake port', async () => {
    const condition = createTravelCondition(validTravelConditionInput());
    const port = new FakeRoutingPort(condition);
    const request = {
      origin: { latitude: 34.9, longitude: 33.6 },
      destination: { latitude: 34.92, longitude: 33.64 },
      mode: 'DRIVE' as const,
      departureAt: new Date('2026-09-01T15:30:00Z'),
    };

    await expect(port.getRoute(request)).resolves.toEqual(condition);
    expect(port.requests).toEqual([request]);
  });
});
