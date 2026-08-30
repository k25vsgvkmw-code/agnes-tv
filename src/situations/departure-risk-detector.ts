import type { Clock } from '../kernel/clock.js';
import type { Situation } from './situation.js';

export interface DepartureRiskInput {
  readonly eventStartsAt: Date;
  readonly travelMinutes: number;
  readonly bufferMinutes: number;
}

export class DepartureRiskDetector {
  constructor(private readonly clock: Clock) {}

  detect(input: DepartureRiskInput): readonly Situation[] {
    const now = this.clock.now();
    const remainingMinutes = (input.eventStartsAt.getTime() - now.getTime()) / 60_000;
    const requiredMinutes = input.travelMinutes + input.bufferMinutes;

    if (remainingMinutes >= requiredMinutes) {
      return [];
    }

    return [
      {
        type: 'LATE_DEPARTURE_RISK',
        confidence: 0.9,
        relatedEntities: [],
        supportingFactors: [
          { name: 'remaining_minutes', value: remainingMinutes },
          { name: 'travel_minutes', value: input.travelMinutes },
          { name: 'buffer_minutes', value: input.bufferMinutes },
        ],
        detectedAt: now,
        expiresAt: new Date(input.eventStartsAt),
      },
    ];
  }
}
