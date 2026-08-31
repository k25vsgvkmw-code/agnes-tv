export type TravelDataQuality = 'fixture' | 'live' | 'mixed' | 'degraded';

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
  readonly startsOn: string;
  readonly endsOn: string;
  readonly nights: number;
  readonly flexibilityDays: number;
  readonly sourceIntent: string;
  readonly departureDay?: 'friday' | 'saturday';
}

export interface PriceQuote {
  readonly currency: string;
  readonly totalAmount: number | null;
  readonly perPersonAmount: number;
  readonly flightAmount: number;
  readonly accommodationAmount: number | null;
  readonly fetchedAt: Date;
  readonly expiresAt?: Date;
  readonly providerReference: string;
  readonly isLive: boolean;
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
  readonly expectedLowC: number;
  readonly expectedHighC: number;
  readonly precipitationRisk?: number;
  readonly suitabilityScore: number;
  readonly sourceQuality: 'historical' | 'forecast' | 'climatology' | 'fixture';
}

export interface SeasonSuitability {
  readonly score: number;
  readonly label: 'Ideal season' | 'Very good period' | 'Shoulder-season value' | 'Off-season';
  readonly reason: string;
  readonly tags: readonly string[];
  readonly expectedLowC?: number;
  readonly expectedHighC?: number;
}

export interface ScoreBreakdown {
  readonly flightValue: number | null;
  readonly accommodationValue: number | null;
  readonly seasonSuitability: number | null;
  readonly weatherSuitability: number | null;
  readonly directness: number | null;
  readonly travelTime: number | null;
  readonly tripLengthFit: number | null;
  readonly experienceRelevance: number | null;
  readonly crowdPressure: number | null;
}

export interface OpportunityCandidate {
  readonly id: string;
  readonly destination: Destination;
  readonly window: TravelWindow;
  readonly priceQuote: PriceQuote;
  readonly journey: JourneySummary;
  readonly seasonSuitability: SeasonSuitability;
  readonly weatherSuitability: WeatherSuitability | null;
  readonly experienceTags: readonly string[];
  readonly crowdScore: number | null;
  readonly scoreBreakdown: ScoreBreakdown;
  readonly totalScore: number;
  readonly confidence: number;
}
