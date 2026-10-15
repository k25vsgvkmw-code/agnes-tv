import type { ScoreBreakdown } from '../domain/types.js';

export interface TravelScoreInput {
  readonly flightValue?: number;
  readonly accommodationValue?: number;
  readonly seasonSuitability?: number;
  readonly weatherSuitability?: number;
  readonly directness?: number;
  readonly travelTime?: number;
  readonly tripLengthFit?: number;
  readonly experienceRelevance?: number;
  readonly crowdPressure?: number;
}

export interface TravelScoreWeights {
  readonly flightValue: number;
  readonly accommodationValue: number;
  readonly seasonSuitability: number;
  readonly weatherSuitability: number;
  readonly directness: number;
  readonly travelTime: number;
  readonly tripLengthFit: number;
  readonly experienceRelevance: number;
  readonly crowdPressure: number;
}

export interface TravelScoreResult {
  readonly total: number;
  readonly breakdown: ScoreBreakdown;
  readonly confidence: number;
}

export const DEFAULT_TRAVEL_SCORE_WEIGHTS: TravelScoreWeights = {
  flightValue: 0.22,
  accommodationValue: 0.16,
  seasonSuitability: 0.18,
  weatherSuitability: 0.12,
  directness: 0.1,
  travelTime: 0.08,
  tripLengthFit: 0.06,
  experienceRelevance: 0.04,
  crowdPressure: 0.04,
};

const FACTORS: readonly (keyof TravelScoreWeights)[] = [
  'flightValue',
  'accommodationValue',
  'seasonSuitability',
  'weatherSuitability',
  'directness',
  'travelTime',
  'tripLengthFit',
  'experienceRelevance',
  'crowdPressure',
];

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function normalizedFactor(value: number | undefined): number | null {
  return value === undefined || !Number.isFinite(value) ? null : clamp(value);
}

export function scoreTravel(
  input: TravelScoreInput,
  weights: TravelScoreWeights = DEFAULT_TRAVEL_SCORE_WEIGHTS,
): TravelScoreResult {
  const breakdown: ScoreBreakdown = {
    flightValue: normalizedFactor(input.flightValue),
    accommodationValue: normalizedFactor(input.accommodationValue),
    seasonSuitability: normalizedFactor(input.seasonSuitability),
    weatherSuitability: normalizedFactor(input.weatherSuitability),
    directness: normalizedFactor(input.directness),
    travelTime: normalizedFactor(input.travelTime),
    tripLengthFit: normalizedFactor(input.tripLengthFit),
    experienceRelevance: normalizedFactor(input.experienceRelevance),
    crowdPressure: normalizedFactor(input.crowdPressure),
  };

  let weighted = 0;
  let availableWeight = 0;
  for (const factor of FACTORS) {
    const value = breakdown[factor];
    if (value === null) continue;
    const weight = Math.max(0, weights[factor]);
    weighted += value * weight;
    availableWeight += weight;
  }

  let total = availableWeight > 0 ? weighted / availableWeight : 0;
  const season = breakdown.seasonSuitability;
  if (season !== null && season < 30) total = Math.min(total, 79);
  else if (season !== null && season < 45) total = Math.min(total, 84);

  const configuredWeight = FACTORS.reduce((sum, factor) => sum + Math.max(0, weights[factor]), 0);
  const confidence = configuredWeight > 0 ? Math.min(1, availableWeight / configuredWeight) : 0;

  return {
    total: Math.round(clamp(total)),
    breakdown,
    confidence: Number(confidence.toFixed(4)),
  };
}
