import type { TravelCondition } from './travel-condition.js';

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';

export interface RouteRequest {
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly mode: TravelMode;
  readonly departureAt: Date;
}

export interface RoutingPort {
  getRoute(request: RouteRequest): Promise<TravelCondition>;
}
