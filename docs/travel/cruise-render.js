import { filterJourneys } from './journeys-data.js';
import { matchesJourneyRegion } from './journey-region.js';
import { classifyJourneySeason, getSeasonalCollections } from './seasonality.js';
import {
  renderAgnesWorldDock,
  renderJourneyCard,
  renderJourneyDetail,
} from './cinematic-render.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function filterCruises(journeys, state) {
  return filterJourneys(journeys, {
    mode: 'sea',
    type: 'cruise',
    departurePort: state.departurePort || undefined,
  }).filter((journey) => matchesJourneyRegion(journey.region, state.region));
}

export function renderDeparturePortRail(ports, state) {
  return `<div class="departure-port-rail">${ports
    .map(
      (port) =>
        `<button data-departure-port="${escapeHtml(port.id)}" class="${state.departurePort === port.id ? 'is-active' : ''}"><strong>${escapeHtml(port.name)}</strong><small>${escapeHtml(port.country)}</small></button>`,
    )
    .join('')}</div>`;
}

function section(title, items, label) {
  return `<section class="cruise-collection"><div class="collection-heading"><p>${label}</p><h2>${title}</h2></div><div class="journey-rail">${items.map((journey) => renderCruiseCard(journey)).join('')}</div></section>`;
}

export function renderCruiseCard(journey) {
  const port = journey.cruise?.departurePort || journey.departurePorts?.[0] || 'curated port';
  return renderJourneyCard(journey, {
    seasonLabel: `FROM ${port.replaceAll('-', ' ').toUpperCase()}`,
  });
}

export function renderCruiseLanding(journeys, state, ports = []) {
  const cruises = journeys.filter((journey) => journey.type === 'cruise');
  const filtered = filterCruises(journeys, state);
  const seasonal = getSeasonalCollections(filtered, state.month);
  const empty =
    state.departurePort && filtered.length === 0
      ? '<section class="cruise-empty" data-empty-cruise-state><p>No curated cruise is currently mapped to that departure port.</p><button data-reset-port>Show all departure ports</button></section>'
      : '';

  return `<main class="agnes-world-page cruise-page"><section class="cruise-hero"><div><p>AGNES CRUISES</p><h1>Start with where you want to sail from.</h1><span>Seasonal journeys first. Departure port always visible.</span></div></section><section class="cruise-search"><label data-cruise-filter="departure-port"><span>Departing from</span><select data-port-select><option value="">Any port</option>${ports
    .map(
      (port) =>
        `<option value="${escapeHtml(port.id)}" ${port.id === state.departurePort ? 'selected' : ''}>${escapeHtml(port.name)}</option>`,
    )
    .join('')}</select></label><label data-cruise-filter="month"><span>When</span><select data-month-select>${MONTHS.map(
    (month, index) =>
      `<option value="${index + 1}" ${index + 1 === state.month ? 'selected' : ''}>${month}</option>`,
  ).join('')}</select></label><label><span>Destination</span><select data-region-select><option value="">Anywhere</option><option>Greece</option><option>Europe</option><option>Americas</option><option>Africa</option></select></label><label><span>Cruise style</span><select><option>Curated</option><option>Island</option><option>Expedition</option></select></label></section>${renderDeparturePortRail(ports, state)}${empty}${section(
    `In Season Now · ${MONTHS[state.month - 1]}`,
    seasonal.rightNow,
    'SAIL NOW',
  )}${section('Coming Next', seasonal.comingNext, 'NEXT WINDOW')}${section(
    'Year-Round',
    seasonal.yearRound,
    'FLEXIBLE',
  )}${!state.departurePort && filtered.length === 0 ? section('Curated cruises', cruises, 'AGNES PICKS') : ''}${renderAgnesWorldDock(state)}</main>`;
}

export function renderCruiseDetail(journey, state) {
  const cruise = journey.cruise;
  const extra = `<section class="journey-section cruise-specific"><div class="section-heading"><p>BY SEA</p><h2>From ${escapeHtml(cruise?.departurePort || 'selected port')}</h2></div><div class="cruise-route">${(cruise?.portsOfCall ?? [])
    .map((port) => `<span>${escapeHtml(port)}</span>`)
    .join('')}</div><div class="ship-overview"><p>SHIP OVERVIEW</p><h3>${escapeHtml(cruise?.ship?.name ?? 'Curated ship')}</h3><span>Editorial placeholder until a verified operator feed is connected.</span></div>${cruise?.cabinClasses?.length ? `<div class="cabin-grid">${cruise.cabinClasses.map((cabin) => `<button data-open-layer="cabins">${escapeHtml(cabin)}</button>`).join('')}</div>` : ''}<button class="request-availability" data-open-layer="inquiry">Request availability</button></section>`;
  return renderJourneyDetail(journey, state, { extra });
}

export { classifyJourneySeason };
