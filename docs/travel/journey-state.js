const VIEWS = new Set(['explore', 'destinations', 'mode', 'cruises', 'journey', 'experiences', 'about']);
const MODES = new Set(['', 'air', 'sea', 'rail', 'road']);
const LAYERS = new Set([null, 'route', 'day-plan', 'transport', 'dates', 'cabins', 'agnes', 'inquiry']);

export function createJourneyState(now = new Date()) {
  return {
    view: 'explore',
    mode: '',
    month: now.getMonth() + 1,
    region: '',
    feeling: '',
    departurePort: '',
    journeyId: '',
    detailLayer: null,
    selectedChapter: '',
    duration: '',
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
    'feeling',
    'departurePort',
    'journeyId',
    'selectedChapter',
    'duration',
    'audience',
    'drivingPace',
    'stayTier',
    'weatherMode',
  ]) {
    if (typeof patch[key] === 'string') next[key] = patch[key];
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
  if (params.get('region')) patch.region = params.get('region');
  if (params.get('feeling')) patch.feeling = params.get('feeling');
  if (params.get('port')) patch.departurePort = params.get('port');
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
  if (state.feeling) params.set('feeling', state.feeling);
  if (state.departurePort) params.set('port', state.departurePort);
  if (state.journeyId) params.set('journey', state.journeyId);
  const query = params.toString();
  return query ? `?${query}` : '';
}
