import { JOURNEYS } from '../../journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from '../../journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from '../../journeys-world-pack-2.js';
const ALL = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS, ...WORLD_CATALOG_PACK_2];
export const OCEANIA_JOURNEYS = ALL.filter((journey) => journey.region === 'Oceania');
