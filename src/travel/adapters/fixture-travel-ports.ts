import { parseCalendarDate } from '../domain/date-intent.js';
import type { Destination, TravelWindow, WeatherSuitability } from '../domain/types.js';
import type {
  AccommodationQuote,
  AccommodationSearchPort,
  DestinationKnowledgePort,
  FlightSearchPort,
  HolidayCalendarPort,
  JourneyQuote,
  TravelPorts,
  WeatherInsightPort,
} from '../ports/travel-ports.js';
import { FIXTURE_HOLIDAYS, FIXTURE_TRAVEL_PROFILES, type FixtureTravelProfile } from './fixture-travel-data.js';

export interface FixtureTravelOptions {
  readonly missingAccommodationFor?: readonly string[];
  readonly failWeatherFor?: readonly string[];
}

function findProfile(destinationId: string): FixtureTravelProfile | undefined {
  return FIXTURE_TRAVEL_PROFILES.find((profile) => profile.destination.id === destinationId);
}

function dateAdjustment(startsOn: string): number {
  const day = parseCalendarDate(startsOn).getUTCDate();
  return ((day % 7) - 3) * 4;
}

class FixtureFlightSearchPort implements FlightSearchPort {
  search(
    origin: string,
    destination: Destination,
    window: TravelWindow,
  ): Promise<JourneyQuote | null> {
    const profile = findProfile(destination.id);
    if (!profile) return Promise.resolve(null);
    const adjustment = dateAdjustment(window.startsOn);
    const pricePerPerson = Math.max(25, profile.baseFlightPerPerson + adjustment);
    const valueScore = Math.min(100, Math.max(0, profile.flightValue - Math.max(0, adjustment) / 2));
    return Promise.resolve({
      pricePerPerson,
      valueScore,
      journey: {
        originAirport: origin,
        destinationAirport: destination.airportCodes[0] ?? destination.id.toUpperCase(),
        outboundDurationMinutes: profile.outboundMinutes,
        inboundDurationMinutes: profile.outboundMinutes,
        stopsOutbound: profile.stops,
        stopsInbound: profile.stops,
        direct: profile.stops === 0,
      },
      providerReference: `fixture:flight:${origin}:${destination.id}:${window.startsOn}`,
      fetchedAt: new Date('2026-09-01T06:00:00Z'),
      isLive: false,
    });
  }
}

class FixtureAccommodationSearchPort implements AccommodationSearchPort {
  constructor(private readonly missingFor: ReadonlySet<string>) {}

  search(
    destination: Destination,
    window: TravelWindow,
    travellers: number,
  ): Promise<AccommodationQuote | null> {
    void travellers;
    if (this.missingFor.has(destination.id)) return Promise.resolve(null);
    const profile = findProfile(destination.id);
    if (!profile) return Promise.resolve(null);
    const adjustment = Math.max(0, dateAdjustment(window.startsOn));
    return Promise.resolve({
      totalAmount: Math.round(profile.accommodationPerNight * window.nights + adjustment),
      valueScore: Math.min(100, Math.max(0, profile.accommodationValue - adjustment / 4)),
      providerReference: `fixture:hotel:${destination.id}:${window.startsOn}`,
      fetchedAt: new Date('2026-09-01T06:00:00Z'),
      isLive: false,
    });
  }
}

class FixtureWeatherInsightPort implements WeatherInsightPort {
  constructor(private readonly failFor: ReadonlySet<string>) {}

  getInsight(destination: Destination, window: TravelWindow): Promise<WeatherSuitability | null> {
    if (this.failFor.has(destination.id)) {
      return Promise.reject(new Error(`fixture weather unavailable for ${destination.id}`));
    }
    const profile = findProfile(destination.id);
    if (!profile) return Promise.resolve(null);
    const month = parseCalendarDate(window.startsOn).getUTCMonth() + 1;
    const climate = profile.climate[month];
    if (!climate) return Promise.resolve(null);
    return Promise.resolve({
      expectedLowC: climate[0],
      expectedHighC: climate[1],
      suitabilityScore: climate[2],
      sourceQuality: 'fixture',
    });
  }
}

class FixtureDestinationKnowledgePort implements DestinationKnowledgePort {
  listDestinations(): Promise<readonly Destination[]> {
    return Promise.resolve(FIXTURE_TRAVEL_PROFILES.map((profile) => profile.destination));
  }

  suitabilityWindows(destinationId: string) {
    return Promise.resolve(findProfile(destinationId)?.suitability ?? []);
  }

  crowdScore(destinationId: string, window: TravelWindow): Promise<number | null> {
    void window;
    return Promise.resolve(findProfile(destinationId)?.crowdScore ?? null);
  }

  experienceRelevance(destinationId: string, window: TravelWindow): Promise<number | null> {
    void window;
    return Promise.resolve(findProfile(destinationId)?.experienceRelevance ?? null);
  }
}

class FixtureHolidayCalendarPort implements HolidayCalendarPort {
  listHolidayWindows(from: string, to: string, locale: string) {
    void locale;
    return Promise.resolve(
      FIXTURE_HOLIDAYS.filter((holiday) => holiday.endsOn >= from && holiday.startsOn <= to),
    );
  }
}

export function createFixtureTravelPorts(options: FixtureTravelOptions = {}): TravelPorts {
  return {
    flightSearch: new FixtureFlightSearchPort(),
    accommodationSearch: new FixtureAccommodationSearchPort(
      new Set(options.missingAccommodationFor ?? []),
    ),
    weatherInsight: new FixtureWeatherInsightPort(new Set(options.failWeatherFor ?? [])),
    destinationKnowledge: new FixtureDestinationKnowledgePort(),
    holidayCalendar: new FixtureHolidayCalendarPort(),
  };
}
