import { filterJourneys } from './journeys-data.js';
import { matchesJourneyRegion } from './journey-region.js';
import { renderJourneyMap } from './map-render.js';
import { resolveTravelImage } from './journey-photo-resolver.js';
import { APPROVED_AUTUMN_HOME } from './homepage-curation.js';

const MONTHS_GREEK = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const media = (image, alt, className = '') => {
  const resolvedImage = resolveTravelImage(image, alt);
  return resolvedImage
    ? `<div class="journey-media ${className}" data-image-fallback="false"><img src="${escapeHtml(resolvedImage)}" alt="${escapeHtml(alt)}" loading="lazy" data-world-image></div>`
    : `<div class="journey-media journey-media-fallback ${className}" data-image-fallback="true" aria-label="${escapeHtml(alt)}"></div>`;
};

export function renderGlobalHeader(state) {
  const nav = [
    ['explore', 'Explore'],
    ['destinations', 'Destinations'],
    ['travel-by', 'Travel by'],
    ['experiences', 'Experiences'],
    ['cruises', 'Cruises'],
    ['saved', 'Saved'],
    ['about', 'About AGNES'],
  ];
  return `<header class="agnes-world-header"><button class="agnes-brand" data-nav-view="explore">AGNES</button><nav aria-label="Primary">${nav
    .map(
      ([id, label]) =>
        `<button type="button" data-nav-view="${id}" class="${state.view === id ? 'is-active' : ''}">${label}</button>`,
    )
    .join('')}</nav><button class="agnes-plan-button" data-agnes-open>Plan with AGNES</button></header>`;
}

export function renderJourneyCard(journey, { seasonLabel = '' } = {}) {
  return `<article class="journey-card" data-journey-id="${escapeHtml(journey.id)}" tabindex="0">${media(journey.hero?.image, journey.title, 'journey-card-media')}<div class="journey-card-scrim"></div><div class="journey-card-actions"><button type="button" data-save-journey="${escapeHtml(journey.id)}" aria-label="Save ${escapeHtml(journey.title)}">♡</button><button type="button" data-compare-journey="${escapeHtml(journey.id)}" aria-label="Compare ${escapeHtml(journey.title)}">⇄</button></div><div class="journey-card-copy"><p>${escapeHtml(seasonLabel || journey.region)} · ${escapeHtml(journey.mode.toUpperCase())}</p><h3>${escapeHtml(journey.title)}</h3><span>${escapeHtml(journey.subtitle)}</span><small>${escapeHtml(journey.duration)}</small></div></article>`;
}

const rail = (title, items, options = {}) =>
  `<section class="agnes-collection"><div class="collection-heading"><p>${escapeHtml(options.kicker ?? 'CURATED BY AGNES')}</p><h2>${escapeHtml(title)}</h2></div><div class="journey-rail">${items
    .map((journey) => renderJourneyCard(journey, { seasonLabel: options.seasonLabel }))
    .join('')}</div></section>`;

export function renderAgnesWorldDock(state, { compact = false } = {}) {
  const history = (state.agnesHistory ?? [])
    .slice(-2)
    .map(
      (entry) =>
        `<div class="agnes-message is-${entry.role === 'agnes' ? 'agnes' : 'user'}"><strong>${entry.role === 'agnes' ? 'AGNES' : 'YOU'}</strong><span>${escapeHtml(entry.text)}</span></div>`,
    )
    .join('');
  const actions = compact
    ? ['Plan with AGNES', 'Find something for October', 'I want mountains', 'I want Northern Lights', 'I want a road trip']
    : ['Show cruises from Limassol', 'I want mountains by train', 'I want sea and islands in October'];
  return `<aside class="agnes-dock${compact ? ' is-contextual editorial-agnes' : ''}" id="agnes"><button type="button" class="agnes-dock-head" data-agnes-open aria-label="Open AGNES travel co-pilot"><span>A</span><span class="agnes-dock-title"><strong>AGNES</strong><small>Travel co-pilot</small></span></button><div class="agnes-history" aria-live="polite">${history}</div><div class="agnes-actions">${actions.map((action) => `<button type="button" data-agnes-action="${escapeHtml(action)}">${escapeHtml(action)}</button>`).join('')}</div><form data-agnes-form><input data-agnes-input placeholder="Tell AGNES how you want to travel…"><button aria-label="Send to AGNES">↑</button></form></aside>`;
}

function renderMonthlyRail(state) {
  return `<aside class="month-rail" aria-label="Explore by month"><button type="button" class="month-rail-brand" data-nav-view="explore" aria-label="Agnes Travel home"><span class="month-rail-mark" aria-hidden="true">⌃</span><span>Agnes<br>Travel</span></button><div class="month-rail-months">${MONTHS_GREEK.map(
    (month, index) =>
      `<button type="button" data-month-jump="${index + 1}" class="${state.month === index + 1 ? 'is-active' : ''}" aria-current="${state.month === index + 1 ? 'true' : 'false'}">${month}${state.month === index + 1 ? '<span class="month-dot" aria-hidden="true"></span>' : ''}</button>`,
  ).join('')}</div><div class="month-rail-foot"><span class="month-rail-compass" aria-hidden="true">↗</span><small>Περισσότερα<br>από ένα ταξίδι<br>μια ιστορία ζωής.</small></div></aside>`;
}

function renderEditorialTopNav(config) {
  return `<nav class="editorial-top-nav" aria-label="Travel discovery"><form data-global-search-form class="editorial-nav-search"><label><span class="sr-only">Αναζήτηση προορισμού</span><span class="editorial-search-icon" aria-hidden="true">⌕</span><input data-global-search-input name="q" placeholder="${escapeHtml(config.searchPlaceholder)}"></label></form><button type="button" data-nav-view="destinations"><span aria-hidden="true">⌖</span> Προορισμοί</button><button type="button" data-nav-view="experiences"><span aria-hidden="true">✣</span> Εμπειρίες</button><button type="button" class="editorial-icon-button" data-nav-view="saved" aria-label="Saved">♡</button><button type="button" class="editorial-icon-button" data-nav-view="about" aria-label="Menu">☰</button></nav>`;
}

function renderEditorialFilters(config) {
  return `<div class="seasonal-filters" aria-label="Seasonal filters">${config.filters
    .map(
      (filter, index) =>
        `<button type="button" class="${index === 0 ? 'is-active' : ''}"${filter === 'Road Trips' ? ' data-mode="road"' : ''}>${escapeHtml(filter)}</button>`,
    )
    .join('')}</div>`;
}

function renderEditorialCard(card, index) {
  const image = resolveTravelImage(card.image, card.title);
  const mediaMarkup = image
    ? `<span class="editorial-card-media" data-image-fallback="false"><img src="${escapeHtml(image)}" alt="${escapeHtml(card.title)}" ${index === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} style="object-position:${escapeHtml(card.objectPosition)}" data-world-image></span>`
    : `<span class="editorial-card-media journey-media-fallback" data-image-fallback="true" aria-label="${escapeHtml(card.title)}"></span>`;
  return `<button type="button" class="editorial-destination-card editorial-card--${escapeHtml(card.role)}" data-card-index="${index}" data-journey-id="${escapeHtml(card.journeyId)}" aria-label="Explore ${escapeHtml(card.title)}">${mediaMarkup}<span class="editorial-card-scrim" aria-hidden="true"></span>${card.badge ? `<span class="editorial-card-badge" aria-hidden="true">${escapeHtml(card.badge)}</span>` : ''}${card.role === 'hero' ? '<span class="editorial-hero-play" aria-hidden="true">▶</span>' : ''}<span class="editorial-card-copy"><span class="editorial-card-location">⌖ ${escapeHtml(card.location)}</span><strong>${escapeHtml(card.title)}</strong><span class="editorial-card-subtitle">${escapeHtml(card.subtitle)}</span></span><span class="editorial-card-arrow" aria-hidden="true">→</span></button>`;
}

export function renderExploreHome(_journeys, state) {
  const config = APPROVED_AUTUMN_HOME;
  return `<main class="agnes-world-page agnes-editorial-home" data-view="explore">${renderMonthlyRail(state)}<section class="editorial-home-canvas">${renderEditorialTopNav(config)}<section class="editorial-home-grid" id="explore"><header class="editorial-intro"><p class="editorial-kicker">${escapeHtml(config.kicker)}</p><h1>${escapeHtml(config.seasonTitle)}</h1><div class="editorial-season-line"><span class="editorial-rule" aria-hidden="true"></span><p class="editorial-subtitle">${escapeHtml(config.seasonSubtitle)}</p></div>${renderEditorialFilters(config)}</header>${config.cards.map(renderEditorialCard).join('')}</section>${renderAgnesWorldDock(state, { compact: true })}</section></main>`;
}

export function renderModeCollection(journeys, state) {
  const list = filterJourneys(journeys, {
    mode: state.mode,
    feeling: state.feeling || undefined,
  }).filter((journey) => matchesJourneyRegion(journey.region, state.region));
  const copy = {
    air: 'Fly somewhere unforgettable.',
    sea: 'Let the sea become the route.',
    rail: 'Watch the world change through the window.',
    road: 'The road is part of the story.',
  };
  return `<main class="agnes-world-page collection-page"><section class="collection-hero"><p>TRAVEL BY ${escapeHtml(state.mode.toUpperCase())}</p><h1>${copy[state.mode] ?? 'Travel differently.'}</h1></section>${rail(`${list.length} curated journeys`, list)}${renderAgnesWorldDock(state)}</main>`;
}

export function renderDestinations(journeys, state) {
  const regions = ['Greece', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
  return `<main class="agnes-world-page collection-page"><section class="collection-hero"><p>DESTINATIONS</p><h1>Choose a part of the world. AGNES will shape the journey.</h1></section>${regions
    .map((region) =>
      rail(
        region,
        journeys.filter((journey) => matchesJourneyRegion(journey.region, region)),
      ),
    )
    .join('')}${renderAgnesWorldDock(state)}</main>`;
}

export function renderExperiences(journeys, state) {
  const feelings = ['romantic', 'wild', 'slow', 'family', 'luxury', 'hidden', 'seasonal'];
  return `<main class="agnes-world-page collection-page"><section class="collection-hero"><p>EXPERIENCES</p><h1>Start with how you want to feel.</h1></section><div class="experience-grid">${feelings
    .map((feeling) => `<button data-feeling="${feeling}">${feeling}</button>`)
    .join('')}</div>${
      state.feeling
        ? rail(state.feeling, filterJourneys(journeys, { feeling: state.feeling }))
        : rail(
            'Selected by feeling',
            journeys.filter((journey) => journey.feelings.length).slice(0, 12),
          )
    }${renderAgnesWorldDock(state)}</main>`;
}

export function renderAbout(state) {
  return `<main class="agnes-world-page about-page"><section class="collection-hero"><p>ABOUT AGNES</p><h1>A travel co-pilot for people who want more than a list of places.</h1><p>AGNES begins with the feeling and the way you want to move, then reveals the practical plan only when you need it.</p></section>${renderAgnesWorldDock(state)}</main>`;
}

function renderMoments(journey) {
  return `<section class="signature-moments">${(journey.signatureMoments ?? [])
    .map(
      (moment) =>
        `<article data-signature-moment="${escapeHtml(moment.id)}">${media(moment.image, moment.title, 'signature-media')}<div class="signature-scrim"></div><div><p>${escapeHtml(moment.label)}</p><h2>${escapeHtml(moment.title)}</h2><span>${escapeHtml(moment.copy)}</span></div></article>`,
    )
    .join('')}</section>`;
}

function renderRoute(journey, state) {
  return `<section class="journey-section journey-route" data-journey-section="route"><div class="section-heading"><p>THE ROUTE</p><h2>Move through the story.</h2></div>${renderJourneyMap(journey, { currentStopId: state.selectedChapter })}<button data-open-layer="route">View route details</button></section>`;
}

function renderChapters(journey) {
  return `<section class="journey-section journey-chapters" data-journey-section="chapters"><div class="section-heading"><p>THE JOURNEY</p><h2>Chapter by chapter.</h2></div>${(journey.chapters ?? [])
    .map(
      (chapter) =>
        `<article class="journey-chapter" data-chapter-id="${escapeHtml(chapter.id)}">${media(chapter.image, chapter.title, 'chapter-media')}<div class="chapter-scrim"></div><div class="chapter-copy"><p>${escapeHtml(chapter.dayLabel)}</p><h3>${escapeHtml(chapter.title)}</h3><span>${escapeHtml(chapter.location)}</span><p>${escapeHtml(chapter.narrative)}</p><button data-open-layer="day-plan" data-chapter="${escapeHtml(chapter.id)}">View day plan</button><aside><strong>AGNES</strong><span>${escapeHtml(chapter.agnes)}</span></aside></div></article>`,
    )
    .join('')}</section>`;
}

export function renderInquirySummary(journey) {
  return `<section class="journey-section inquiry-summary" data-journey-section="inquiry"><div><p>YOUR JOURNEY</p><h2>Ready to make it real?</h2><span>${escapeHtml(journey.pricing?.disclaimer ?? 'Editorial journey. Live pricing and availability require a connected provider.')}</span></div><button data-open-layer="inquiry">Plan with AGNES</button></section>`;
}

export function renderOperationalLayer(journey, state) {
  if (!state.detailLayer) return '';
  const chapters = journey.chapters ?? [];
  const chapter = chapters.find((item) => item.id === state.selectedChapter) ?? chapters[0];
  return `<div class="operational-backdrop" data-detail-layer="${escapeHtml(state.detailLayer)}"><aside class="operational-layer" role="dialog" aria-modal="true" aria-labelledby="operational-layer-title"><button data-detail-close aria-label="Close details">×</button><p>PRACTICAL PLAN</p><h2 id="operational-layer-title">${escapeHtml(chapter?.title ?? journey.title)}</h2><dl><dt>Timing</dt><dd>${escapeHtml(chapter?.operational?.timing ?? 'Set after dates are chosen')}</dd><dt>Transit</dt><dd>${escapeHtml(chapter?.operational?.transit ?? 'Final routing depends on selected dates')}</dd><dt>Note</dt><dd>${escapeHtml(chapter?.operational?.note ?? 'AGNES will refine this with your preferences.')}</dd></dl><p class="indicative-note">Indicative editorial guidance. Final details depend on selected dates and providers.</p></aside></div>`;
}

export function renderJourneyDetail(journey, state, { extra = '' } = {}) {
  return `<main class="agnes-world-page journey-detail" data-journey-id="${escapeHtml(journey.id)}"><section class="journey-hero" data-journey-section="hero">${media(journey.hero?.image, journey.title, 'journey-hero-media')}<div class="hero-scrim"></div><div class="journey-hero-copy"><p>${escapeHtml(journey.hero?.eyebrow ?? journey.mode.toUpperCase())}</p><h1>${escapeHtml(journey.title)}</h1><h2>${escapeHtml(journey.subtitle)}</h2><div><span>${escapeHtml(journey.duration)}</span><span>${escapeHtml(journey.region)}</span><span>${escapeHtml(journey.mode.toUpperCase())}</span></div><div class="journey-hero-actions"><button data-save-journey="${escapeHtml(journey.id)}">Save journey</button><button data-compare-journey="${escapeHtml(journey.id)}">Compare</button><button data-open-layer="day-plan">See the practical plan</button></div></div></section>${renderMoments(journey)}${renderRoute(journey, state)}${renderChapters(journey)}${extra}<section class="journey-section agnes-inline" data-journey-section="agnes"><p>AGNES</p><h2>Make this journey yours.</h2><button data-agnes-open>Adapt with AGNES</button></section>${renderInquirySummary(journey)}${renderOperationalLayer(journey, state)}${renderAgnesWorldDock(state)}</main>`;
}
