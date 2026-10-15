import type { Clock } from '../../kernel/clock.js';
import {
  addCalendarDays,
  anyDatesIntent,
  calendarMonthIntent,
  durationHorizonIntent,
  exactDateIntent,
  formatCalendarDate,
  type TravelDateIntent,
} from '../domain/date-intent.js';
import type {
  OpportunityCandidate,
  PriceQuote,
  TravelDataQuality,
  TravelWindow,
} from '../domain/types.js';
import type { TravelPorts } from '../ports/travel-ports.js';
import { scoreTravel } from '../scoring/travel-score.js';
import { getSeasonalTheme, type SeasonalTheme } from '../seasonality/seasonal-theme.js';
import { evaluateSeasonSuitability } from '../seasonality/seasonality.js';
import { generateThreeDayEscapeWindows, generateTravelWindows } from './window-generator.js';

export interface TravelOpportunityEngineDependencies extends TravelPorts {
  readonly clock: Clock;
  readonly timeZone?: string;
}

export interface DiscoverTravelRequest {
  readonly intent: TravelDateIntent;
  readonly travellers: number;
  readonly origin?: string;
  readonly currency?: string;
  readonly destinationIds?: readonly string[];
  readonly includeBelowPrimaryThreshold?: boolean;
}

export interface TravelHomeRequest {
  readonly date?: string;
  readonly travellers: number;
  readonly origin?: string;
  readonly currency?: string;
}

export interface HolidayCollection {
  readonly id: string;
  readonly label: string;
  readonly opportunities: readonly OpportunityCandidate[];
}

export interface TravelHomeModel {
  readonly origin: string;
  readonly currency: string;
  readonly theme: SeasonalTheme;
  readonly dataQuality: TravelDataQuality;
  readonly forYouNow: readonly OpportunityCandidate[];
  readonly threeDayEscapes: readonly OpportunityCandidate[];
  readonly next30Days: readonly OpportunityCandidate[];
  readonly nextMonth: readonly OpportunityCandidate[];
  readonly holidays: readonly HolidayCollection[];
  readonly bestThisSeason: readonly OpportunityCandidate[];
  readonly bestThisYear: readonly OpportunityCandidate[];
}

function averageJourneyMinutes(window: TravelWindow, candidate: OpportunityCandidate): number {
  void window;
  return Math.round(
    (candidate.journey.outboundDurationMinutes + candidate.journey.inboundDurationMinutes) / 2,
  );
}

function travelTimeScore(minutes: number): number {
  if (minutes <= 120) return 100;
  if (minutes <= 180) return 95;
  if (minutes <= 240) return 88;
  if (minutes <= 360) return 76;
  if (minutes <= 600) return 62;
  return 45;
}

function tripLengthFit(nights: number): number {
  if (nights === 3 || nights === 4) return 100;
  if (nights === 2 || nights === 5) return 88;
  if (nights >= 6 && nights <= 8) return 80;
  return 70;
}

function dateFromIso(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

function nextMonth(date: Date): { year: number; month: number } {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { year: copy.getUTCFullYear(), month: copy.getUTCMonth() + 1 };
}

function endOfYear(date: Date): string {
  return `${date.getUTCFullYear()}-12-31`;
}

function dataQualityFor(candidates: readonly OpportunityCandidate[]): TravelDataQuality {
  if (candidates.length === 0) return 'degraded';
  return candidates.every((candidate) => candidate.priceQuote.providerReference.startsWith('fixture:'))
    ? 'fixture'
    : 'mixed';
}

export class TravelOpportunityEngine {
  private readonly timeZone: string;

  constructor(private readonly deps: TravelOpportunityEngineDependencies) {
    this.timeZone = deps.timeZone ?? 'Asia/Nicosia';
  }

  rankForPresentation<T extends { readonly totalScore: number; readonly destinationId: string }>(
    items: readonly T[],
  ): readonly T[] {
    return [...items].sort(
      (left, right) =>
        right.totalScore - left.totalScore || left.destinationId.localeCompare(right.destinationId),
    );
  }

  private async candidateFor(
    destinationId: string,
    window: TravelWindow,
    travellers: number,
    origin: string,
    currency: string,
  ): Promise<OpportunityCandidate | null> {
    const destinations = await this.deps.destinationKnowledge.listDestinations();
    const destination = destinations.find((item) => item.id === destinationId);
    if (!destination) return null;

    const flight = await this.deps.flightSearch.search(origin, destination, window).catch(() => null);
    if (!flight) return null;

    const accommodation = await this.deps.accommodationSearch
      .search(destination, window, travellers)
      .catch(() => null);
    const weather = await this.deps.weatherInsight.getInsight(destination, window).catch(() => null);
    const suitabilityWindows = await this.deps.destinationKnowledge
      .suitabilityWindows(destination.id)
      .catch(() => []);
    const season = evaluateSeasonSuitability(destination.id, window.startsOn, suitabilityWindows);
    const crowd = await this.deps.destinationKnowledge.crowdScore(destination.id, window).catch(() => null);
    const experience = await this.deps.destinationKnowledge
      .experienceRelevance(destination.id, window)
      .catch(() => null);

    const accommodationPerPerson = accommodation ? accommodation.totalAmount / travellers : 0;
    const priceQuote: PriceQuote = {
      currency,
      totalAmount: accommodation
        ? Math.round(flight.pricePerPerson * travellers + accommodation.totalAmount)
        : null,
      perPersonAmount: Math.round(flight.pricePerPerson + accommodationPerPerson),
      flightAmount: Math.round(flight.pricePerPerson * travellers),
      accommodationAmount: accommodation?.totalAmount ?? null,
      fetchedAt: flight.fetchedAt,
      providerReference: flight.providerReference,
      isLive: flight.isLive && (accommodation?.isLive ?? false),
    };

    const directness = flight.journey.direct ? 100 : Math.max(50, 85 - flight.journey.stopsOutbound * 15);
    const provisional: OpportunityCandidate = {
      id: `${destination.id}:${window.startsOn}:${window.endsOn}`,
      destination,
      window,
      priceQuote,
      journey: flight.journey,
      seasonSuitability: season,
      weatherSuitability: weather,
      experienceTags: season.tags,
      crowdScore: crowd,
      scoreBreakdown: {
        flightValue: null,
        accommodationValue: null,
        seasonSuitability: null,
        weatherSuitability: null,
        directness: null,
        travelTime: null,
        tripLengthFit: null,
        experienceRelevance: null,
        crowdPressure: null,
      },
      totalScore: 0,
      confidence: 0,
    };

    const score = scoreTravel({
      flightValue: flight.valueScore,
      accommodationValue: accommodation?.valueScore,
      seasonSuitability: season.score,
      weatherSuitability: weather?.suitabilityScore,
      directness,
      travelTime: travelTimeScore(averageJourneyMinutes(window, provisional)),
      tripLengthFit: tripLengthFit(window.nights),
      experienceRelevance: experience ?? undefined,
      crowdPressure: crowd ?? undefined,
    });

    return {
      ...provisional,
      scoreBreakdown: score.breakdown,
      totalScore: score.total,
      confidence: score.confidence,
    };
  }

  private async discoverWindows(
    windows: readonly TravelWindow[],
    request: Omit<DiscoverTravelRequest, 'intent'>,
  ): Promise<readonly OpportunityCandidate[]> {
    const destinations = await this.deps.destinationKnowledge.listDestinations();
    const allowed = request.destinationIds
      ? new Set(request.destinationIds)
      : null;
    const selectedDestinations = allowed
      ? destinations.filter((destination) => allowed.has(destination.id))
      : destinations;
    const candidates: OpportunityCandidate[] = [];

    for (const window of windows) {
      for (const destination of selectedDestinations) {
        const candidate = await this.candidateFor(
          destination.id,
          window,
          request.travellers,
          request.origin ?? 'LCA',
          request.currency ?? 'EUR',
        );
        if (candidate) candidates.push(candidate);
      }
    }

    return candidates
      .filter((candidate) => request.includeBelowPrimaryThreshold || candidate.totalScore >= 80)
      .sort(
        (left, right) =>
          right.totalScore - left.totalScore ||
          right.confidence - left.confidence ||
          left.destination.id.localeCompare(right.destination.id) ||
          left.window.startsOn.localeCompare(right.window.startsOn),
      );
  }

  discover(request: DiscoverTravelRequest): Promise<readonly OpportunityCandidate[]> {
    return this.discoverWindows(generateTravelWindows(request.intent), request);
  }

  async home(request: TravelHomeRequest): Promise<TravelHomeModel> {
    const now = request.date ? dateFromIso(request.date) : this.deps.clock.now();
    const date = request.date ?? formatCalendarDate(now);
    const origin = request.origin ?? 'LCA';
    const currency = request.currency ?? 'EUR';
    const common = { travellers: request.travellers, origin, currency } as const;

    const next30End = addCalendarDays(date, 30);
    const next90End = addCalendarDays(date, 90);
    const forYouNow = await this.discover({
      ...common,
      intent: durationHorizonIntent(date, next30End, 3, 4),
    });
    const threeDayEscapes = await this.discoverWindows(
      generateThreeDayEscapeWindows(date, next30End),
      common,
    );
    const next30Days = forYouNow;
    const month = nextMonth(now);
    const nextMonthResults = await this.discover({
      ...common,
      intent: calendarMonthIntent(month.year, month.month, 3, 4),
    });
    const bestThisSeason = await this.discover({
      ...common,
      intent: durationHorizonIntent(date, next90End, 3, 4),
    });
    const bestThisYear = await this.discover({
      ...common,
      intent: anyDatesIntent(date, endOfYear(now), 3, 4),
    });

    const holidayWindows = await this.deps.holidayCalendar
      .listHolidayWindows(date, addCalendarDays(date, 366), 'en-CY')
      .catch(() => []);
    const holidays: HolidayCollection[] = [];
    for (const holiday of holidayWindows) {
      const opportunities = await this.discover({
        ...common,
        intent: durationHorizonIntent(holiday.startsOn, holiday.endsOn, 3, 4),
      });
      holidays.push({ id: holiday.id, label: holiday.label, opportunities: opportunities.slice(0, 8) });
    }

    const allPrimary = [
      ...forYouNow,
      ...threeDayEscapes,
      ...nextMonthResults,
      ...bestThisSeason,
      ...bestThisYear,
    ];

    return {
      origin,
      currency,
      theme: getSeasonalTheme(now, this.timeZone),
      dataQuality: dataQualityFor(allPrimary),
      forYouNow: forYouNow.slice(0, 12),
      threeDayEscapes: threeDayEscapes.slice(0, 12),
      next30Days: next30Days.slice(0, 12),
      nextMonth: nextMonthResults.slice(0, 12),
      holidays,
      bestThisSeason: bestThisSeason.slice(0, 12),
      bestThisYear: bestThisYear.slice(0, 20),
    };
  }
}
