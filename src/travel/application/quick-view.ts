import {
  addCalendarDays,
  anyDatesIntent,
  calendarMonthIntent,
  exactDateIntent,
  nightsBetween,
  plusMinusDateIntent,
  type TravelDateIntent,
} from '../domain/date-intent.js';
import type { OpportunityCandidate } from '../domain/types.js';
import type { TravelOpportunityEngine } from './opportunity-engine.js';

export interface QuickViewRequest {
  readonly destinationId: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly travellers: number;
  readonly origin?: string;
  readonly currency?: string;
}

export interface QuickViewDateAlternative {
  readonly offsetDays: -7 | -3 | 0 | 3 | 7;
  readonly selected: boolean;
  readonly opportunity: OpportunityCandidate;
}

export interface QuickViewAction {
  readonly kind: 'plus_minus' | 'any_dates' | 'calendar_month' | 'best_3_nights' | 'best_4_nights';
  readonly intent: TravelDateIntent;
}

export interface QuickViewModel {
  readonly selected: OpportunityCandidate;
  readonly sameDestinationDates: readonly QuickViewDateAlternative[];
  readonly sameDateDestinations: readonly OpportunityCandidate[];
  readonly explanation: string;
  readonly actions: readonly QuickViewAction[];
}

function firstOrThrow(
  values: readonly OpportunityCandidate[],
  message: string,
): OpportunityCandidate {
  const first = values[0];
  if (!first) throw new Error(message);
  return first;
}

function explanationFor(
  selected: OpportunityCandidate,
  alternatives: readonly OpportunityCandidate[],
): string {
  const better = alternatives.find((candidate) => candidate.totalScore > selected.totalScore);
  if (!better) {
    return `${selected.destination.city} remains one of the strongest overall opportunities for these exact dates based on season, value and journey quality.`;
  }
  return `${better.destination.city} ranks higher for these dates because its overall season suitability, price value and journey quality combine into a stronger AGNES Travel Score.`;
}

export async function buildQuickView(
  engine: TravelOpportunityEngine,
  request: QuickViewRequest,
): Promise<QuickViewModel> {
  const common = {
    travellers: request.travellers,
    origin: request.origin,
    currency: request.currency,
    includeBelowPrimaryThreshold: true,
  } as const;

  const selected = firstOrThrow(
    await engine.discover({
      ...common,
      intent: exactDateIntent(request.startsOn, request.endsOn),
      destinationIds: [request.destinationId],
    }),
    'Selected travel opportunity is unavailable',
  );

  const offsets = [-7, -3, 0, 3, 7] as const;
  const sameDestinationDates: QuickViewDateAlternative[] = [];
  const nights = nightsBetween(request.startsOn, request.endsOn);
  for (const offsetDays of offsets) {
    const startsOn = addCalendarDays(request.startsOn, offsetDays);
    const endsOn = addCalendarDays(startsOn, nights);
    const opportunity = firstOrThrow(
      await engine.discover({
        ...common,
        intent: exactDateIntent(startsOn, endsOn),
        destinationIds: [request.destinationId],
      }),
      `No opportunity for offset ${offsetDays}`,
    );
    sameDestinationDates.push({
      offsetDays,
      selected: offsetDays === 0,
      opportunity,
    });
  }

  const sameDateDestinations = (
    await engine.discover({
      ...common,
      intent: exactDateIntent(request.startsOn, request.endsOn),
    })
  ).filter((candidate) => candidate.destination.id !== request.destinationId);

  const start = new Date(`${request.startsOn}T12:00:00Z`);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + 1;
  const horizonEnd = addCalendarDays(request.startsOn, 180);

  const actions: readonly QuickViewAction[] = [
    {
      kind: 'plus_minus',
      intent: plusMinusDateIntent(request.startsOn, request.endsOn, 7),
    },
    {
      kind: 'any_dates',
      intent: anyDatesIntent(request.startsOn, horizonEnd, 3, 4),
    },
    {
      kind: 'calendar_month',
      intent: calendarMonthIntent(year, month, 3, 4),
    },
    {
      kind: 'best_3_nights',
      intent: anyDatesIntent(request.startsOn, horizonEnd, 3, 3),
    },
    {
      kind: 'best_4_nights',
      intent: anyDatesIntent(request.startsOn, horizonEnd, 4, 4),
    },
  ];

  return {
    selected,
    sameDestinationDates,
    sameDateDestinations,
    explanation: explanationFor(selected, sameDateDestinations),
    actions,
  };
}
