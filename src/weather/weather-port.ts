import type { HouseholdId } from '../kernel/ids.js';
import type { WeatherSnapshot } from './weather-snapshot.js';

export interface WeatherQuery {
  readonly householdId: HouseholdId;
  readonly placeId: string;
  readonly point: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly now: Date;
}

export interface WeatherPort {
  getCurrent(query: WeatherQuery): Promise<WeatherSnapshot>;
}
