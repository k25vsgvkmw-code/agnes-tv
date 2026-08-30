import type { CalendarEventId } from '../kernel/ids.js';
import type { Situation } from './situation.js';

export interface DepartureRiskInput {
  readonly now: Date;
  readonly eventStartsAt: Date;
  readonly travelMinutes: number;
  readonly bufferMinutes: number;
  readonly eventId: CalendarEventId;
}

export interface DepartureRiskFactors extends Readonly<Record<string, unknown>> {
  readonly eventStartsAt: string;
  readonly travelMinutes: number;
  readonly bufferMinutes: number;
  readonly remainingMinutes: number;
  readonly requiredLeadMinutes: number;
  readonly deficitMinutes: number;
}

export type DepartureRiskSituation = Situation<DepartureRiskFactors>;

export class DepartureRiskDetector {
  detect(input: DepartureRiskInput): readonly DepartureRiskSituation[] {
    const remainingMinutes =
      (input.eventStartsAt.getTime() - input.now.getTime()) / 60_000;
    const requiredLeadMinutes = input.travelMinutes + input.bufferMinutes;

    if (remainingMinutes <= 0 || remainingMinutes >= requiredLeadMinutes) return [];

    const deficitMinutes = requiredLeadMinutes - remainingMinutes;
    const urgencyRatio = Math.min(1, deficitMinutes / Math.max(requiredLeadMinutes, 1));
    const confidence = Math.min(1, 0.85 + urgencyRatio * 0.15);

    return [
      {
        type: 'LATE_DEPARTURE_RISK',
        confidence,
        detectedAt: new Date(input.now),
        expiresAt: new Date(input.eventStartsAt),
        relatedEntities: [{ type: 'calendar_event', id: input.eventId }],
        supportingFactors: {
          eventStartsAt: input.eventStartsAt.toISOString(),
          travelMinutes: input.travelMinutes,
          bufferMinutes: input.bufferMinutes,
          remainingMinutes,
          requiredLeadMinutes,
          deficitMinutes,
        },
      },
    ];
  }
}
