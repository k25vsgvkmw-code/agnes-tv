import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { DepartureRiskDetector } from '../../src/situations/departure-risk-detector.js';

describe('departure risk detector', () => {
  it('detects departure risk when remaining time is below travel time plus buffer', () => {
    const detector = new DepartureRiskDetector(new FixedClock(new Date('2026-09-01T15:00:00Z')));

    const situations = detector.detect({
      eventStartsAt: new Date('2026-09-01T15:30:00Z'),
      travelMinutes: 25,
      bufferMinutes: 10,
    });

    expect(situations[0]?.type).toBe('LATE_DEPARTURE_RISK');
    expect(situations[0]?.confidence).toBeGreaterThan(0.8);
  });

  it('does not detect departure risk when there is enough time to leave', () => {
    const detector = new DepartureRiskDetector(new FixedClock(new Date('2026-09-01T15:00:00Z')));

    const situations = detector.detect({
      eventStartsAt: new Date('2026-09-01T16:00:00Z'),
      travelMinutes: 25,
      bufferMinutes: 10,
    });

    expect(situations).toEqual([]);
  });
});
