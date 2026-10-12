import { DESTINATIONS, ORIGINS, JOURNEYS, OPERATORS } from './data/index.js';

const DESTINATION_REFS = {
  'zagori-metsovo-meteora': ['gr-zagori'],
  'greek-islands-limassol': ['gr-santorini'],
  'greek-islands-piraeus': ['gr-santorini'],
  'switzerland-grand-rail': ['ch-zermatt'],
  'dolomites-grand-drive': ['it-dolomites'],
  'japan-rail-escape': ['jp-tokyo', 'jp-kyoto'],
  'tokyo-kyoto': ['jp-tokyo', 'jp-kyoto'],
  'cape-town-winelands': ['za-cape-town'],
  'patagonia-adventure': ['ar-patagonia'],
};

const ORIGIN_REFS = {
  'zagori-metsovo-meteora': ['road-ioannina'],
  'greek-islands-limassol': ['port-limassol'],
  'greek-islands-piraeus': ['port-piraeus'],
  'switzerland-grand-rail': ['station-zurich'],
  'japan-rail-escape': ['station-tokyo'],
  'tokyo-kyoto': ['airport-nrt'],
  'cape-town-winelands': ['airport-cpt'],
};

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) throw new Error(`${label} record missing id`);
    if (seen.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
}

function normalizeJourney(journey) {
  return {
    ...journey,
    slug: journey.slug ?? journey.id,
    countries: journey.countries ?? String(journey.country ?? '').split(' / ').filter(Boolean),
    destinationIds: journey.destinationIds ?? DESTINATION_REFS[journey.id] ?? [],
    originIds: journey.originIds ?? ORIGIN_REFS[journey.id] ?? [],
    styles: journey.styles ?? [],
    commerce: journey.commerce ?? { providerRefs: [], liveSearchSupported: false },
    seasonality: journey.seasonality ?? {
      bestMonths: journey.bestMonths ?? [],
      availableMonths: journey.availableMonths ?? [],
      shoulderMonths: journey.shoulderMonths ?? [],
      yearRound: Boolean(journey.yearRound),
    },
  };
}

export function createCatalog({ destinations = [], origins = [], journeys = [], operators = [] }) {
  assertUnique(destinations, 'destination');
  assertUnique(origins, 'origin');
  assertUnique(journeys, 'journey');
  assertUnique(operators, 'operator');

  const destinationMap = new Map(destinations.map((item) => [item.id, item]));
  const originMap = new Map(origins.map((item) => [item.id, item]));
  const operatorMap = new Map(operators.map((item) => [item.id, item]));
  const normalizedJourneys = journeys.map(normalizeJourney);

  for (const journey of normalizedJourneys) {
    for (const id of journey.destinationIds ?? []) {
      if (!destinationMap.has(id)) throw new Error(`Journey ${journey.id} references missing destination ${id}`);
    }
    for (const id of journey.originIds ?? []) {
      if (!originMap.has(id)) throw new Error(`Journey ${journey.id} references missing origin ${id}`);
    }
    for (const id of journey.commerce?.providerRefs ?? []) {
      if (!operatorMap.has(id)) throw new Error(`Journey ${journey.id} references missing operator ${id}`);
    }
  }

  return {
    destinations: [...destinations],
    origins: [...origins],
    journeys: normalizedJourneys,
    operators: [...operators],
    byId: {
      destinations: destinationMap,
      origins: originMap,
      journeys: new Map(normalizedJourneys.map((item) => [item.id, item])),
      operators: operatorMap,
    },
  };
}

export const CATALOG = createCatalog({
  destinations: DESTINATIONS,
  origins: ORIGINS,
  journeys: JOURNEYS,
  operators: OPERATORS,
});

export const getJourney = (id) => CATALOG.byId.journeys.get(id) ?? null;
export const getDestination = (id) => CATALOG.byId.destinations.get(id) ?? null;
export const getOrigin = (id) => CATALOG.byId.origins.get(id) ?? null;
export const getJourneysByMode = (mode) => CATALOG.journeys.filter((journey) => journey.mode === mode);
