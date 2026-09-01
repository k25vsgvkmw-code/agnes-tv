import type { FastifyInstance } from 'fastify';
import type { EducationService } from '../education/education-service.js';

export function registerEducationRoutes(
  app: FastifyInstance,
  service: EducationService,
): Promise<void> {
  void app;
  void service;
  return Promise.resolve();
}
