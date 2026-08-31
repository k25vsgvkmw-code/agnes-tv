export type IsoDate = `${number}-${number}-${number}`;
export type TravelSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonLabel =
  | 'ideal-season'
  | 'very-good-period'
  | 'shoulder-season-value'
  | 'poor-period';

export interface Destination {
  readonly id: string;
  readonly city: string;
  readonly country: string;
  readonly countryCode: string;
  readonly airportCodes: readonly string[];
  readonly timezone: string;
  readonly tags: readonly string[];
  readonly heroImageReference?: string;
}

export interface TravelWindow {
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly nights: number;
  readonly flexibilityDays: number;
  readonly sourceIntent: string;
}

export interface PriceQuote {
  readonly currency: string;
  readonly totalAmount?: number;
  readonly perPersonAmount?: number;
  readonly flightAmount?: number;
  readonly accommodationAmount?: number;
  readonly fetchedAt: string;
  readonly expiresAt?: string;
  readonly providerReference: string;
}

export interface JourneySummary {
  readonly originAirport: string;
  readonly destinationAirport: string;
  readonly outboundDurationMinutes: number;
  readonly inboundDurationMinutes: number;
  readonly stopsOutbound: number;
  readonly stopsInbound: number;
  readonly direct: boolean;
}

export interface WeatherSuitability {
  readonly expectedLowC?: number;
  readonly expectedHighC?: number;
  readonly precipitationRisk?: number;
  readonly suitabilityScore: number;
  readonly sourceQuality: number;
}

export interface SeasonSuitability {
  readonly score: number;
  readonly label: SeasonLabel;
  readonly reason: string;
  readonly tags: readonly string[];
}

export interface TravelScoreBreakdown {
  readonly flightValue: number;
  readonly accommodationValue: number;
  readonly seasonSuitability: number;
  readonly weatherSuitability: number;
  readonly directness: number;
  readonly travelTimeFit: number;
  readonly tripLengthFit: number;
  readonly eventRelevance: number;
  readonly crowdScore: number;
}

export interface OpportunityCandidate {
  readonly id: string;
  readonly destination: Destination;
  readonly window: TravelWindow;
  readonly priceQuote: PriceQuote;
  readonly journey: JourneySummary;
  readonly seasonSuitability: SeasonSuitability;
  readonly weatherSuitability?: WeatherSuitability;
  readonly experienceTags: readonly string[];
  readonly crowdScore?: number;
  readonly scoreBreakdown: TravelScoreBreakdown;
  readonly totalScore: number;
  readonly confidence: number;
}

export interface TravelSearchContext {
  readonly originAirport?: string;
  readonly currency?: string;
  readonly adults: number;
  readonly children?: number;
  readonly timezone?: string;
}

function parseIsoDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ISO calendar date: ${date}`);
  }
  return parsed;
}

export function makeTravelWindow(
  startsOn: IsoDate,
  endsOn: IsoDate,
  sourceIntent: string,
  flexibilityDays = 0,
): TravelWindow {
  const start = parseIsoDate(startsOn);
  const end = parseIsoDate(endsOn);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  if (nights <= 0) {
    throw new Error('Travel window must end after it starts');
  }
  if (!Number.isInteger(flexibilityDays) || flexibilityDays < 0) {
    throw new Error('flexibilityDays must be a non-negative integer');
  }

  return { startsOn, endsOn, nights, flexibilityDays, sourceIntent };
}
