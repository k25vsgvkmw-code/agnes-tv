/* global document, window, history, queueMicrotask */
import { JOURNEYS, DEPARTURE_PORTS } from './journeys-data.js';
import { GLOBAL_EXPANSION_JOURNEYS } from './journeys-global-expansion.js';
import { rankJourneysForMonth } from './seasonality.js';
import {
  createJourneyState,
  applyJourneyStatePatch,
  parseJourneyUrl,
  serializeJourneyUrl,
} from './journey-state.js';
import { handleJourneyAgnesMessage } from './agnes-journey.js';
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

const ALL_JOURNEYS = [...JOURNEYS, ...GLOBAL_EXPANSION_JOURNEYS];
const getJourneyById = (id) => ALL_JOURNEYS.find((journey) => journey.id === id) ?? null;

const header = document.querySelector('#site-header');
const view = document.querySelector('#view');
let state = parseJourneyUrl(window.location.search, new Date());
let notice = '';

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

function pageHtml() {
  if (state.view === 'cruises') {
    return renderCruiseLanding(ALL_JOURNEYS, state, DEPARTURE_PORTS);
  }
  if (state.view === 'mode') {
    return renderModeCollection(rankJourneysForMonth(ALL_JOURNEYS, state.month), state);
  }
  if (state.view === 'destinations') return renderDestinations(ALL_JOURNEYS, state);
  if (state.view === 'experiences') return renderExperiences(ALL_JOURNEYS, state);
  if (state.view === 'about') return renderAbout(state);
  if (state.view === 'journey') {
    const journey = getJourneyById(state.journeyId);
    if (!journey) return renderExploreHome(ALL_JOURNEYS, state);
    return journey.type === 'cruise'
      ? renderCruiseDetail(journey, state)
      : renderJourneyDetail(journey, state);
  }
  return renderExploreHome(ALL_JOURNEYS, state);
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
  header.innerHTML = renderGlobalHeader(state);
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
  const journey = state.journeyId ? getJourneyById(state.journeyId) : null;
  const result = handleJourneyAgnesMessage(cleaned, {
    journey,
    journeys: ALL_JOURNEYS,
    state,
  });
  appendAgnes(cleaned, result.reply, result.statePatch);
  const url = serializeJourneyUrl(state) || window.location.pathname;
  history.pushState({}, '', url);
  render();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button, [data-journey-id]');
  if (!button) return;

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
  if (button.matches('[data-agnes-action]')) {
    runAgnes(button.dataset.agnesAction);
  }
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
  }
  if (element.matches('[data-month-select]')) {
    pushState({ month: Number(element.value) });
  }
  if (element.matches('[data-region-select]')) {
    pushState({ region: element.value });
  }
});

document.addEventListener('submit', (event) => {
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
