import type { FastifyInstance } from 'fastify';
import { buildQuickView } from '../travel/application/quick-view.js';
import type { TravelOpportunityEngine } from '../travel/application/opportunity-engine.js';

function parseTravellers(value: unknown): number {
  const travellers = Number(value);
  if (!Number.isInteger(travellers) || travellers < 1 || travellers > 12) {
    throw new RangeError('travellers must be an integer from 1 to 12');
  }
  return travellers;
}

function stringQuery(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RangeError(`${name} is required`);
  }
  return value;
}

export async function registerTravelRoutes(
  app: FastifyInstance,
  travelOpportunityEngine: TravelOpportunityEngine,
): Promise<void> {
  app.get('/travel/home', async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      return await travelOpportunityEngine.home({
        date: typeof query.date === 'string' ? query.date : undefined,
        travellers: parseTravellers(query.travellers),
      });
    } catch (error) {
      return reply.code(400).send({
        error: 'invalid_travel_request',
        message: error instanceof Error ? error.message : 'Invalid travel request',
      });
    }
  });

  app.get('/travel/quick-view', async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const result = await buildQuickView(travelOpportunityEngine, {
        destinationId: stringQuery(query.destinationId, 'destinationId'),
        startsOn: stringQuery(query.startsOn, 'startsOn'),
        endsOn: stringQuery(query.endsOn, 'endsOn'),
        travellers: parseTravellers(query.travellers),
      });
      return {
        ...result,
        dataQuality: 'fixture' as const,
      };
    } catch (error) {
      return reply.code(400).send({
        error: 'invalid_travel_request',
        message: error instanceof Error ? error.message : 'Invalid travel request',
      });
    }
  });
}
