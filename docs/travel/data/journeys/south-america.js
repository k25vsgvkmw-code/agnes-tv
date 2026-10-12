import { JOURNEYS } from '../../journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from '../../journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from '../../journeys-world-pack-2.js';
const ALL = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS, ...WORLD_CATALOG_PACK_2];
export const SOUTH_AMERICA_JOURNEYS = ALL.filter((journey) => journey.region === 'South America' || /Patagonia|Peru|Brazil|Argentina|Chile/i.test(`${journey.title} ${journey.country ?? ''}`));
