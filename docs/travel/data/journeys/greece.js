import { JOURNEYS } from '../../journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from '../../journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from '../../journeys-world-pack-2.js';

export const GREECE_JOURNEYS = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS, ...WORLD_CATALOG_PACK_2].filter(
  (journey) => journey.region === 'Greece',
);
