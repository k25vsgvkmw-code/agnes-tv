/* global URLSearchParams */

const VIEWS = new Set([
  'explore',
  'destinations',
  'mode',
  'cruises',
  'journey',
  'experiences',
  'about',
  'search',
  'saved',
  'compare',
]);
const MODES = new Set(['', 'air', 'sea', 'rail', 'road']);
const LAYERS = new Set([null, 'route', 'day-plan', 'transport', 'dates', 'cabins', 'agnes', 'inquiry']);

export function createJourneyState(now = new Date()) {
  return {
    view: 'explore',
    mode: '',
    month: now.getMonth() + 1,
    region: '',
    country: '',
    feeling: '',
    query: '',
    departurePort: '',
    originId: '',
    journeyId: '',
    detailLayer: null,
    selectedChapter: '',
    duration: '',
    durationMin: null,
    durationMax: null,
    railStyle: '',
    cruiseStyle: '',
    roadStyle: '',
    audience: '',
    drivingPace: '',
    stayTier: '',
    weatherMode: '',
    agnesHistory: [],
  };
}

export function applyJourneyStatePatch(state, patch = {}) {
  const next = { ...state, agnesHistory: [...(state.agnesHistory ?? [])] };
  if (VIEWS.has(patch.view)) next.view = patch.view;
  if (MODES.has(patch.mode)) next.mode = patch.mode;
  if (Number.isInteger(patch.month) && patch.month >= 1 && patch.month <= 12) next.month = patch.month;
  for (const key of [
    'region',
    'country',
    'feeling',
    'query',
    'departurePort',
    'originId',
    'journeyId',
    'selectedChapter',
    'duration',
    'railStyle',
    'cruiseStyle',
    'roadStyle',
    'audience',
    'drivingPace',
    'stayTier',
    'weatherMode',
  ]) {
    if (typeof patch[key] === 'string') next[key] = patch[key];
  }
  for (const key of ['durationMin', 'durationMax']) {
    if (patch[key] === null || (Number.isInteger(patch[key]) && patch[key] > 0)) next[key] = patch[key];
  }
  if (LAYERS.has(patch.detailLayer)) next.detailLayer = patch.detailLayer;
  if (Array.isArray(patch.agnesHistory)) next.agnesHistory = [...patch.agnesHistory];
  return next;
}

export function parseJourneyUrl(search, now = new Date()) {
  const base = createJourneyState(now);
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(String(search ?? '').replace(/^\?/, ''));
  const patch = {};
  const view = params.get('view');
  const mode = params.get('mode');
  const month = Number(params.get('month'));
  if (VIEWS.has(view)) patch.view = view;
  if (MODES.has(mode)) patch.mode = mode;
  if (Number.isInteger(month) && month >= 1 && month <= 12) patch.month = month;

  const stringFields = {
    region: 'region',
    country: 'country',
    feeling: 'feeling',
    q: 'query',
    port: 'departurePort',
    origin: 'originId',
    rail: 'railStyle',
    cruise: 'cruiseStyle',
    road: 'roadStyle',
  };
  for (const [param, key] of Object.entries(stringFields)) {
    if (params.get(param)) patch[key] = params.get(param);
  }

  const durationMin = Number(params.get('minDays'));
  const durationMax = Number(params.get('maxDays'));
  if (Number.isInteger(durationMin) && durationMin > 0) patch.durationMin = durationMin;
  if (Number.isInteger(durationMax) && durationMax > 0) patch.durationMax = durationMax;

  if (params.get('journey')) {
    patch.journeyId = params.get('journey');
    patch.view = 'journey';
  }
  return applyJourneyStatePatch(base, patch);
}

export function serializeJourneyUrl(state) {
  const params = new URLSearchParams();
  if (state.view && state.view !== 'explore') params.set('view', state.view);
  if (state.mode) params.set('mode', state.mode);
  if (state.month) params.set('month', String(state.month));
  if (state.region) params.set('region', state.region);
  if (state.country) params.set('country', state.country);
  if (state.feeling) params.set('feeling', state.feeling);
  if (state.query) params.set('q', state.query);
  if (state.departurePort) params.set('port', state.departurePort);
  if (state.originId) params.set('origin', state.originId);
  if (state.durationMin) params.set('minDays', String(state.durationMin));
  if (state.durationMax) params.set('maxDays', String(state.durationMax));
  if (state.railStyle) params.set('rail', state.railStyle);
  if (state.cruiseStyle) params.set('cruise', state.cruiseStyle);
  if (state.roadStyle) params.set('road', state.roadStyle);
  if (state.view === 'journey' && state.journeyId) params.set('journey', state.journeyId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const parseJourneyState = parseJourneyUrl;
export const serializeJourneyState = serializeJourneyUrl;
export const applyStatePatch = applyJourneyStatePatch;
