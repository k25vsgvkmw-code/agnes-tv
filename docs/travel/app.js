/* global document, window, history, queueMicrotask, localStorage */
import { JOURNEYS, DEPARTURE_PORTS } from './journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from './journeys-global-expansion.js';
import { WORLD_CATALOG_PACK_2 } from './journeys-world-pack-2.js';
import { CATALOG } from './catalog.js';
import { rankJourneysForMonth } from './seasonality.js';
import {
  createJourneyState,
  applyJourneyStatePatch,
  parseJourneyUrl,
  serializeJourneyUrl,
} from './journey-state.js';
import {
  renderGlobalHeader,
  renderExploreHome,
  renderModeCollection,
  renderDestinations,
  renderExperiences,
  renderAbout,
  renderJourneyDetail,
} from './cinematic-render.js';
import { renderCruiseLanding, renderCruiseDetail } from './cruise-render.js';
import { renderRailLanding, renderRailDetail } from './rail-render.js';
import { renderRoadLanding, renderRoadDetail } from './road-render.js';
import { renderAirLanding, renderAirDetail } from './air-render.js';
import { buildSearchIndex, getSearchFacets, searchJourneys } from './search-index.js';
import { renderSearchPage } from './search-render.js';
import { renderSavedPage, renderComparePage } from './compare-render.js';
import {
  loadSavedState,
  saveJourney,
  removeSavedJourney,
  toggleCompareJourney,
} from './saved-journeys.js';
import { planWithAgnes } from './agnes-planner-v2.js';

const ALL_JOURNEYS = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS, ...WORLD_CATALOG_PACK_2];
const APP_CATALOG = {
  ...CATALOG,
  journeys: ALL_JOURNEYS,
};
const SEARCH_INDEX = buildSearchIndex(APP_CATALOG);
const SEARCH_FACETS = getSearchFacets(SEARCH_INDEX);
const getJourneyById = (id) => ALL_JOURNEYS.find((journey) => journey.id === id) ?? null;

const header = document.querySelector('#site-header');
const view = document.querySelector('#view');
let state = parseJourneyUrl(window.location.search, new Date());
let notice = '';

function savedState() {
  return loadSavedState(localStorage);
}

function stateForRender() {
  const saved = savedState();
  return { ...state, saved: saved.saved, compare: saved.compare };
}

function normalizeState(next) {
  if (next.journeyId && !getJourneyById(next.journeyId)) {
    notice = 'Journey not found. Showing Explore instead.';
    return applyJourneyStatePatch(createJourneyState(new Date()), {
      month: next.month,
      view: 'explore',
    });
  }
  if (
    next.departurePort &&
    !DEPARTURE_PORTS.some((port) => port.id === next.departurePort)
  ) {
    return applyJourneyStatePatch(next, { departurePort: '' });
  }
  return next;
}

function pushState(patch, { replace = false } = {}) {
  state = normalizeState(applyJourneyStatePatch(state, patch));
  const url = serializeJourneyUrl(state) || window.location.pathname;
  if (replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);
  render();
}

function searchResults() {
  return searchJourneys(SEARCH_INDEX, state.query, {
    month: state.month,
    mode: state.mode,
    region: state.region,
    country: state.country,
    originId: state.originId,
    feeling: state.feeling,
    style: state.railStyle || state.cruiseStyle || state.roadStyle,
    durationDays: state.durationDays,
  });
}

function renderModePage(renderState) {
  const ranked = rankJourneysForMonth(ALL_JOURNEYS, state.month);
  if (state.mode === 'rail') return renderRailLanding(ranked, renderState);
  if (state.mode === 'road') return renderRoadLanding(ranked, renderState);
  if (state.mode === 'air') return renderAirLanding(ranked, renderState);
  if (state.mode === 'sea') return renderCruiseLanding(ranked, renderState, DEPARTURE_PORTS);
  return renderModeCollection(ranked, renderState);
}

function renderJourneyPage(journey, renderState) {
  if (journey.type === 'cruise') return renderCruiseDetail(journey, renderState);
  if (journey.mode === 'rail') return renderRailDetail(journey, renderState);
  if (journey.mode === 'road') return renderRoadDetail(journey, renderState);
  if (journey.mode === 'air') return renderAirDetail(journey, renderState);
  return renderJourneyDetail(journey, renderState);
}

function pageHtml() {
  const renderState = stateForRender();
  if (state.view === 'search') return renderSearchPage(searchResults(), renderState, SEARCH_FACETS);
  if (state.view === 'saved') return renderSavedPage(ALL_JOURNEYS, renderState);
  if (state.view === 'compare') return renderComparePage(ALL_JOURNEYS, renderState);
  if (state.view === 'cruises') {
    return renderCruiseLanding(ALL_JOURNEYS, renderState, DEPARTURE_PORTS);
  }
  if (state.view === 'mode') return renderModePage(renderState);
  if (state.view === 'destinations') return renderDestinations(ALL_JOURNEYS, renderState);
  if (state.view === 'experiences') return renderExperiences(ALL_JOURNEYS, renderState);
  if (state.view === 'about') return renderAbout(renderState);
  if (state.view === 'journey') {
    const journey = getJourneyById(state.journeyId);
    if (!journey) return renderExploreHome(ALL_JOURNEYS, renderState);
    return renderJourneyPage(journey, renderState);
  }
  return renderExploreHome(ALL_JOURNEYS, renderState);
}

function applyImageFallbacks() {
  document.querySelectorAll('[data-world-image]').forEach((image) => {
    image.onerror = () => {
      const wrap = image.closest('.journey-media');
      if (wrap) {
        wrap.dataset.imageFallback = 'true';
        wrap.classList.add('journey-media-fallback');
      }
      image.remove();
    };
  });
}

function render() {
  state = normalizeState(state);
  header.innerHTML = renderGlobalHeader(stateForRender());
  const banner = notice ? `<div class="world-notice" role="status">${notice}</div>` : '';
  notice = '';
  view.innerHTML = `${banner}${pageHtml()}`;
  applyImageFallbacks();
}

function appendAgnes(message, reply, patch) {
  const historyEntries = [
    ...(state.agnesHistory ?? []),
    { role: 'user', text: message },
    { role: 'agnes', text: reply },
  ];
  const navigationPatch = patch.view && patch.view !== 'journey' ? { journeyId: '' } : {};
  state = applyJourneyStatePatch(state, {
    ...patch,
    ...navigationPatch,
    agnesHistory: historyEntries,
  });
}

function runAgnes(message) {
  const cleaned = String(message ?? '').trim();
  if (!cleaned) return;
  const result = planWithAgnes(cleaned, { catalog: ALL_JOURNEYS, state });
  appendAgnes(cleaned, result.reply, result.statePatch);
  if (result.matches?.length && !result.statePatch.view) {
    state = applyJourneyStatePatch(state, { view: 'search', query: '' });
  }
  const url = serializeJourneyUrl(state) || window.location.pathname;
  history.pushState({}, '', url);
  render();
}

function updateSaved(id, action) {
  if (!id) return;
  if (action === 'save') {
    const current = savedState();
    if (current.saved.includes(id)) removeSavedJourney(id, localStorage);
    else saveJourney(id, localStorage);
    notice = current.saved.includes(id) ? 'Removed from Saved.' : 'Saved for later.';
  } else {
    toggleCompareJourney(id, localStorage);
    notice = 'Compare shortlist updated.';
  }
  render();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button, [data-journey-id]');
  if (!button) return;

  if (button.matches('[data-save-journey]')) {
    event.preventDefault();
    event.stopPropagation();
    updateSaved(button.dataset.saveJourney, 'save');
    return;
  }
  if (button.matches('[data-compare-journey]')) {
    event.preventDefault();
    event.stopPropagation();
    updateSaved(button.dataset.compareJourney, 'compare');
    return;
  }

  if (button.matches('[data-nav-view]')) {
    const target = button.dataset.navView;
    if (target === 'travel-by') {
      pushState({ view: 'explore', mode: '', journeyId: '' });
      queueMicrotask(() =>
        document.querySelector('.travel-by')?.scrollIntoView({ behavior: 'smooth' }),
      );
      return;
    }
    if (target === 'cruises') {
      pushState({ view: 'cruises', mode: 'sea', journeyId: '' });
      return;
    }
    pushState({ view: target, journeyId: '', detailLayer: null });
    return;
  }

  if (button.matches('[data-month-jump]')) {
    pushState({ month: Number(button.dataset.monthJump), view: 'explore' });
    return;
  }
  if (button.matches('[data-mode]')) {
    pushState({ view: 'mode', mode: button.dataset.mode, journeyId: '' });
    return;
  }
  if (button.matches('[data-region]')) {
    pushState({ view: 'destinations', region: button.dataset.region, journeyId: '' });
    return;
  }
  if (button.matches('[data-feeling]')) {
    pushState({ view: 'experiences', feeling: button.dataset.feeling, journeyId: '' });
    return;
  }
  if (button.matches('[data-journey-id]')) {
    pushState({
      view: 'journey',
      journeyId: button.dataset.journeyId,
      detailLayer: null,
    });
    return;
  }
  if (button.matches('[data-departure-port]')) {
    pushState({
      view: 'cruises',
      mode: 'sea',
      departurePort: button.dataset.departurePort,
      journeyId: '',
    });
    return;
  }
  if (button.matches('[data-reset-port]')) {
    pushState({ departurePort: '' });
    return;
  }
  if (button.matches('[data-open-layer]')) {
    pushState({
      detailLayer: button.dataset.openLayer,
      selectedChapter: button.dataset.chapter || state.selectedChapter,
    });
    return;
  }
  if (button.matches('[data-detail-close]')) {
    pushState({ detailLayer: null });
    return;
  }
  if (button.matches('[data-agnes-open]')) {
    document.querySelector('#agnes [data-agnes-input]')?.focus();
    return;
  }
  if (button.matches('[data-agnes-action]')) runAgnes(button.dataset.agnesAction);
});

document.addEventListener('change', (event) => {
  const element = event.target;
  if (element.matches('[data-port-select]')) {
    pushState({
      view: 'cruises',
      mode: 'sea',
      departurePort: element.value,
      journeyId: '',
    });
    return;
  }
  if (element.matches('[data-month-select]')) {
    pushState({ month: Number(element.value) });
    return;
  }
  if (element.matches('[data-region-select]')) {
    pushState({ region: element.value });
    return;
  }
  if (element.matches('[data-rail-style]')) {
    pushState({ railStyle: element.value });
    return;
  }
  if (element.matches('[data-road-style]')) {
    pushState({ roadStyle: element.value });
    return;
  }
  if (element.matches('[data-camper]')) {
    state = { ...state, camper: element.checked };
    render();
    return;
  }
  if (element.matches('[data-origin-input]')) {
    pushState({ originId: element.value.trim() });
    return;
  }
  if (element.matches('[data-duration-days]')) {
    state = { ...state, durationDays: Number(element.value) || null };
    render();
    return;
  }
  if (element.closest('[data-search-filter]')) {
    const filters = element.closest('[data-search-filter]');
    pushState({
      view: 'search',
      mode: filters.querySelector('[name="mode"]')?.value ?? state.mode,
      region: filters.querySelector('[name="region"]')?.value ?? state.region,
      feeling: filters.querySelector('[name="feeling"]')?.value ?? state.feeling,
    });
  }
});

document.addEventListener('submit', (event) => {
  const searchForm = event.target.closest('[data-global-search-form]');
  if (searchForm) {
    event.preventDefault();
    const query = searchForm.querySelector('[data-global-search-input]')?.value?.trim() ?? '';
    pushState({ view: 'search', query, journeyId: '' });
    return;
  }
  const form = event.target.closest('[data-agnes-form]');
  if (!form) return;
  event.preventDefault();
  runAgnes(form.querySelector('[data-agnes-input]')?.value);
});

window.addEventListener('popstate', () => {
  state = normalizeState(parseJourneyUrl(window.location.search, new Date()));
  render();
});

state = normalizeState(state);
history.replaceState({}, '', serializeJourneyUrl(state) || window.location.pathname);
render();
