import type { Destination, JourneySummary, TravelWindow, WeatherSuitability } from '../domain/types.js';
import type { SuitabilityWindow } from '../seasonality/seasonality.js';

export interface JourneyQuote {
  readonly pricePerPerson: number;
  readonly valueScore: number;
  readonly journey: JourneySummary;
  readonly providerReference: string;
  readonly fetchedAt: Date;
  readonly isLive: boolean;
}

export interface AccommodationQuote {
  readonly totalAmount: number;
  readonly valueScore: number;
  readonly providerReference: string;
  readonly fetchedAt: Date;
  readonly isLive: boolean;
}

export interface HolidayWindow {
  readonly id: string;
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly tags: readonly string[];
}

export interface FlightSearchPort {
  search(
    origin: string,
    destination: Destination,
    window: TravelWindow,
  ): Promise<JourneyQuote | null>;
}

export interface AccommodationSearchPort {
  search(
    destination: Destination,
    window: TravelWindow,
    travellers: number,
  ): Promise<AccommodationQuote | null>;
}

export interface WeatherInsightPort {
  getInsight(destination: Destination, window: TravelWindow): Promise<WeatherSuitability | null>;
}

export interface DestinationKnowledgePort {
  listDestinations(): Promise<readonly Destination[]>;
  suitabilityWindows(destinationId: string): Promise<readonly SuitabilityWindow[]>;
  crowdScore(destinationId: string, window: TravelWindow): Promise<number | null>;
  experienceRelevance(destinationId: string, window: TravelWindow): Promise<number | null>;
}

export interface HolidayCalendarPort {
  listHolidayWindows(from: string, to: string, locale: string): Promise<readonly HolidayWindow[]>;
}

export interface TravelPorts {
  readonly flightSearch: FlightSearchPort;
  readonly accommodationSearch: AccommodationSearchPort;
  readonly weatherInsight: WeatherInsightPort;
  readonly destinationKnowledge: DestinationKnowledgePort;
  readonly holidayCalendar: HolidayCalendarPort;
}
