import { describe, expect, it } from 'vitest';
import { DepartureRiskDetector } from '../../src/situations/departure-risk-detector.js';
import type { CalendarEventId } from '../../src/kernel/ids.js';

const eventId = '84000000-0000-4000-8000-000000000001' as CalendarEventId;
const detector = new DepartureRiskDetector();

describe('DepartureRiskDetector', () => {
  it('detects departure risk when remaining time is below travel time plus buffer', () => {
    const situations = detector.detect({
      now: new Date('2026-09-01T15:00:00Z'),
      eventStartsAt: new Date('2026-09-01T15:30:00Z'),
      travelMinutes: 25,
      bufferMinutes: 10,
      eventId,
    });

    expect(situations).toHaveLength(1);
    expect(situations[0]).toMatchObject({
      type: 'LATE_DEPARTURE_RISK',
      relatedEntities: [{ type: 'calendar_event', id: eventId }],
      supportingFactors: {
        eventStartsAt: '2026-09-01T15:30:00.000Z',
        travelMinutes: 25,
        bufferMinutes: 10,
        remainingMinutes: 30,
        requiredLeadMinutes: 35,
        deficitMinutes: 5,
      },
    });
    expect(situations[0]?.confidence).toBeGreaterThan(0.8);
    expect(situations[0]?.detectedAt).toEqual(new Date('2026-09-01T15:00:00Z'));
    expect(situations[0]?.expiresAt).toEqual(new Date('2026-09-01T15:30:00Z'));
  });

  it('returns no situation when remaining time covers travel time plus buffer', () => {
    const situations = detector.detect({
      now: new Date('2026-09-01T15:00:00Z'),
      eventStartsAt: new Date('2026-09-01T16:00:00Z'),
      travelMinutes: 25,
      bufferMinutes: 10,
      eventId,
    });

    expect(situations).toEqual([]);
  });
});
