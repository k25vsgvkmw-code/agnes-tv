export const SAVED_STORAGE_KEY = 'agnes.world.saved.v2';
const VERSION = 2;
const emptyState = () => ({ version: VERSION, saved: [], compare: [] });

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function write(storage, state) {
  storage?.setItem?.(SAVED_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function loadSavedState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SAVED_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION) return emptyState();
    return {
      version: VERSION,
      saved: unique(Array.isArray(parsed.saved) ? parsed.saved : []),
      compare: unique(Array.isArray(parsed.compare) ? parsed.compare : []).slice(-3),
    };
  } catch {
    return emptyState();
  }
}

export function saveJourney(id, storage = globalThis.localStorage) {
  const state = loadSavedState(storage);
  if (!state.saved.includes(id)) state.saved.push(id);
  return write(storage, state);
}

export function removeSavedJourney(id, storage = globalThis.localStorage) {
  const state = loadSavedState(storage);
  state.saved = state.saved.filter((item) => item !== id);
  state.compare = state.compare.filter((item) => item !== id);
  return write(storage, state);
}

export function toggleCompareJourney(id, storage = globalThis.localStorage) {
  const state = loadSavedState(storage);
  if (state.compare.includes(id)) {
    state.compare = state.compare.filter((item) => item !== id);
  } else {
    state.compare = [...state.compare, id].slice(-3);
  }
  return write(storage, state);
}

export function getComparedJourneys(catalog, storage = globalThis.localStorage) {
  const state = loadSavedState(storage);
  const journeys = Array.isArray(catalog?.journeys) ? catalog.journeys : [];
  const byId = new Map(journeys.map((journey) => [journey.id, journey]));
  return state.compare.map((id) => byId.get(id)).filter(Boolean);
}
