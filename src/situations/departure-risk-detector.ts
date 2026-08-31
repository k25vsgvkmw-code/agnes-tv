import { randomUUID } from 'node:crypto';
import type { Situation } from './situation.js';

export interface DepartureRiskInput {
  readonly now: Date;
  readonly eventStartsAt: Date;
  readonly travelMinutes: number;
  readonly bufferMinutes: number;
  readonly eventId?: string;
}

export class DepartureRiskDetector {
  detect(input: DepartureRiskInput): readonly Situation[] {
    const remainingMinutes = Math.floor(
      (input.eventStartsAt.getTime() - input.now.getTime()) / 60_000,
    );
    const requiredMinutes = input.travelMinutes + input.bufferMinutes;

    if (remainingMinutes >= requiredMinutes) {
      return [];
    }

    const deficit = requiredMinutes - remainingMinutes;
    const confidence = Math.min(0.99, 0.82 + deficit / Math.max(requiredMinutes, 1) * 0.17);

    return [
      {
        id: randomUUID(),
        type: 'LATE_DEPARTURE_RISK',
        confidence,
        relatedEntities: input.eventId ? [input.eventId] : [],
        supportingFactors: {
          eventStartsAt: input.eventStartsAt.toISOString(),
          travelMinutes: input.travelMinutes,
          bufferMinutes: input.bufferMinutes,
          remainingMinutes,
        },
        detectedAt: new Date(input.now),
        expiresAt: new Date(input.eventStartsAt),
      },
    ];
  }
}
