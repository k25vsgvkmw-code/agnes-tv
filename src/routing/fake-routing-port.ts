import type { RouteRequest, RoutingPort } from './routing-port.js';
import type { TravelCondition } from './travel-condition.js';

export class FakeRoutingPort implements RoutingPort {
  readonly requests: RouteRequest[] = [];

  constructor(private readonly condition: TravelCondition) {}

  async getRoute(request: RouteRequest): Promise<TravelCondition> {
    this.requests.push({
      ...request,
      origin: { ...request.origin },
      destination: { ...request.destination },
      departureAt: new Date(request.departureAt.getTime()),
    });

    return this.condition;
  }
}
