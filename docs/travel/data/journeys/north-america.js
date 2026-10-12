import { JOURNEYS } from '../../journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from '../../journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from '../../journeys-world-pack-2.js';
const ALL = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS, ...WORLD_CATALOG_PACK_2];
export const NORTH_AMERICA_JOURNEYS = ALL.filter((journey) => ['North America', 'Americas'].includes(journey.region) && !/Patagonia|Peru|Brazil|Argentina|Chile/i.test(`${journey.title} ${journey.country ?? ''}`));
