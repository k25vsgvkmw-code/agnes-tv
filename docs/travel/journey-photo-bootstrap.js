import { JOURNEYS } from './journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from './journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from './journeys-world-pack-2.js';
import { applyJourneyPhotography } from './journey-photos.js';

for (const collection of [JOURNEYS, GLOBAL_EXPANSION_JOURNEYS, WORLD_CATALOG_PACK_2]) {
  const photographed = applyJourneyPhotography(collection);
  collection.splice(0, collection.length, ...photographed);
}
