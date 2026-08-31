import { describe, expect, it } from 'vitest';
import { DepartureRiskDetector } from '../../src/situations/departure-risk-detector.js';

describe('DepartureRiskDetector', () => {
  it('detects departure risk when remaining time is below travel time plus buffer', () => {
    const detector = new DepartureRiskDetector();
    const situations = detector.detect({
      now: new Date('2026-09-01T15:00:00Z'),
      eventStartsAt: new Date('2026-09-01T15:30:00Z'),
      travelMinutes: 25,
      bufferMinutes: 10,
      eventId: 'event-1',
    });

    expect(situations[0]?.type).toBe('LATE_DEPARTURE_RISK');
    expect(situations[0]?.confidence).toBeGreaterThan(0.8);
    expect(situations[0]?.supportingFactors).toMatchObject({
      eventStartsAt: '2026-09-01T15:30:00.000Z',
      travelMinutes: 25,
      bufferMinutes: 10,
      remainingMinutes: 30,
    });
  });

  it('returns no risk when enough time remains', () => {
    const detector = new DepartureRiskDetector();
    const situations = detector.detect({
      now: new Date('2026-09-01T14:30:00Z'),
      eventStartsAt: new Date('2026-09-01T15:30:00Z'),
      travelMinutes: 25,
      bufferMinutes: 10,
      eventId: 'event-1',
    });

    expect(situations).toEqual([]);
  });
});
