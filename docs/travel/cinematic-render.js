import { filterJourneys } from './journeys-data.js';
import { getSeasonalCollections } from './seasonality.js';

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

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const media = (image, alt, className = '') =>
  image
    ? `<div class="journey-media ${className}" data-image-fallback="false"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" data-world-image></div>`
    : `<div class="journey-media journey-media-fallback ${className}" data-image-fallback="true" aria-label="${escapeHtml(alt)}"></div>`;

export function renderGlobalHeader(state) {
  const nav = [
    ['explore', 'Explore'],
    ['destinations', 'Destinations'],
    ['travel-by', 'Travel by'],
    ['experiences', 'Experiences'],
    ['cruises', 'Cruises'],
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
  return `<article class="journey-card" data-journey-id="${escapeHtml(journey.id)}" tabindex="0">${media(journey.hero?.image, journey.title, 'journey-card-media')}<div class="journey-card-scrim"></div><div class="journey-card-copy"><p>${escapeHtml(seasonLabel || journey.region)} · ${escapeHtml(journey.mode.toUpperCase())}</p><h3>${escapeHtml(journey.title)}</h3><span>${escapeHtml(journey.subtitle)}</span><small>${escapeHtml(journey.duration)}</small></div></article>`;
}

const rail = (title, items, options = {}) =>
  `<section class="agnes-collection"><div class="collection-heading"><p>${escapeHtml(options.kicker ?? 'CURATED BY AGNES')}</p><h2>${escapeHtml(title)}</h2></div><div class="journey-rail">${items
    .map((journey) => renderJourneyCard(journey, { seasonLabel: options.seasonLabel }))
    .join('')}</div></section>`;

export function renderExploreHome(journeys, state) {
  const seasonal = getSeasonalCollections(journeys, state.month);
  const featured = [...journeys]
    .sort((a, b) => (b.editorialPriority ?? 0) - (a.editorialPriority ?? 0))
    .slice(0, 8);
  const regions = ['Europe', 'Greece', 'Asia', 'Africa', 'Americas', 'Oceania'];
  return `<main class="agnes-world-page" data-view="explore">
 <section class="agnes-world-hero">${media(featured[0]?.hero?.image, 'AGNES World', 'agnes-world-hero-media')}<div class="hero-scrim"></div><div class="hero-copy"><p>AGNES WORLD</p><h1>See the world differently.</h1><h2>By air. By sea. By rail. By road.</h2><div class="hero-actions"><button data-agnes-open>Tell AGNES how you want to travel</button><button data-scroll-explore>Explore journeys</button></div></div></section>
 <section class="travel-by" id="explore"><div class="collection-heading"><p>HOW DO YOU WANT TO MOVE?</p><h2>Travel by</h2></div><div class="mode-grid">${[
   ['air', 'FLY'],
   ['sea', 'SAIL'],
   ['rail', 'RIDE THE RAILS'],
   ['road', 'HIT THE ROAD'],
 ]
   .map(([mode, label]) => `<button class="mode-tile mode-${mode}" data-mode="${mode}"><span>${label}</span></button>`)
   .join('')}</div></section>
 ${rail(`Right Now · ${MONTHS[state.month - 1]}`, seasonal.rightNow.slice(0, 8), {
   kicker: 'WHERE THE WORLD IS AT ITS BEST',
   seasonLabel: 'IN SEASON',
 })}
 ${rail('Featured journeys', featured, { kicker: 'AGNES PICKS' })}
 <section class="region-collection"><div class="collection-heading"><p>EXPLORE BY REGION</p><h2>The world, edited.</h2></div><div class="region-grid">${regions
   .map((region) => `<button data-region="${region}">${region}</button>`)
   .join('')}</div></section>
 <section class="agnes-prompt-band"><div><p>PLAN WITH AGNES</p><h2>Tell me how you want the journey to feel.</h2></div><button data-agnes-open>Ask AGNES →</button></section>
 </main>`;
}

export function renderModeCollection(journeys, state) {
  const list = filterJourneys(journeys, {
    mode: state.mode,
    region: state.region || undefined,
    feeling: state.feeling || undefined,
  });
  const copy = {
    air: 'Fly somewhere unforgettable.',
    sea: 'Let the sea become the route.',
    rail: 'Watch the world change through the window.',
    road: 'The road is part of the story.',
  };
  return `<main class="agnes-world-page collection-page"><section class="collection-hero"><p>TRAVEL BY ${escapeHtml(state.mode.toUpperCase())}</p><h1>${copy[state.mode] ?? 'Travel differently.'}</h1></section>${rail(`${list.length} curated journeys`, list)}</main>`;
}

export function renderDestinations(journeys) {
  const regions = ['Greece', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
  return `<main class="agnes-world-page collection-page"><section class="collection-hero"><p>DESTINATIONS</p><h1>Choose a part of the world. AGNES will shape the journey.</h1></section>${regions
    .map((region) => rail(region, journeys.filter((journey) => journey.region === region)))
    .join('')}</main>`;
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
            journeys.filter((journey) => journey.feelings.length).slice(0, 10),
          )
    }</main>`;
}

export function renderAbout() {
  return `<main class="agnes-world-page about-page"><section class="collection-hero"><p>ABOUT AGNES</p><h1>A travel co-pilot for people who want more than a list of places.</h1><p>AGNES begins with the feeling and the way you want to move, then reveals the practical plan only when you need it.</p></section></main>`;
}

function renderMoments(journey) {
  return `<section class="signature-moments">${journey.signatureMoments
    .map(
      (moment) =>
        `<article data-signature-moment="${escapeHtml(moment.id)}">${media(moment.image, moment.title, 'signature-media')}<div class="signature-scrim"></div><div><p>${escapeHtml(moment.label)}</p><h2>${escapeHtml(moment.title)}</h2><span>${escapeHtml(moment.copy)}</span></div></article>`,
    )
    .join('')}</section>`;
}

function renderRoute(journey) {
  return `<section class="journey-section journey-route" data-journey-section="route"><div class="section-heading"><p>THE ROUTE</p><h2>Move through the story.</h2></div><div class="route-line">${journey.route.stops
    .map(
      (stop, index) =>
        `<div><span>${index + 1}</span><strong>${escapeHtml(stop.name)}</strong></div>`,
    )
    .join('')}</div><button data-open-layer="route">View route details</button></section>`;
}

function renderChapters(journey) {
  return `<section class="journey-section journey-chapters" data-journey-section="chapters"><div class="section-heading"><p>THE JOURNEY</p><h2>Chapter by chapter.</h2></div>${journey.chapters
    .map(
      (chapter) =>
        `<article class="journey-chapter" data-chapter-id="${escapeHtml(chapter.id)}">${media(chapter.image, chapter.title, 'chapter-media')}<div class="chapter-scrim"></div><div class="chapter-copy"><p>${escapeHtml(chapter.dayLabel)}</p><h3>${escapeHtml(chapter.title)}</h3><span>${escapeHtml(chapter.location)}</span><p>${escapeHtml(chapter.narrative)}</p><button data-open-layer="day-plan" data-chapter="${escapeHtml(chapter.id)}">View day plan</button><aside><strong>AGNES</strong><span>${escapeHtml(chapter.agnes)}</span></aside></div></article>`,
    )
    .join('')}</section>`;
}

export function renderInquirySummary(journey) {
  return `<section class="journey-section inquiry-summary" data-journey-section="inquiry"><div><p>YOUR JOURNEY</p><h2>Ready to make it real?</h2><span>${escapeHtml(journey.pricing.disclaimer)}</span></div><button data-open-layer="inquiry">Plan with AGNES</button></section>`;
}

export function renderAgnesWorldDock(state) {
  const history = (state.agnesHistory ?? [])
    .slice(-2)
    .map(
      (entry) =>
        `<div class="agnes-message is-${entry.role === 'agnes' ? 'agnes' : 'user'}"><strong>${entry.role === 'agnes' ? 'AGNES' : 'YOU'}</strong><span>${escapeHtml(entry.text)}</span></div>`,
    )
    .join('');
  return `<aside class="agnes-dock" id="agnes"><div class="agnes-dock-head"><span>A</span><div><strong>AGNES</strong><small>Travel co-pilot</small></div></div><div class="agnes-history" aria-live="polite">${history}</div><div class="agnes-actions"><button data-agnes-action="Show cruises from Limassol">Cruises from Limassol</button><button data-agnes-action="I want mountains by train">Mountains by train</button><button data-agnes-action="I want sea and islands in October">Sea & islands in October</button></div><form data-agnes-form><input data-agnes-input placeholder="Tell AGNES how you want to travel…"><button aria-label="Send to AGNES">↑</button></form></aside>`;
}

export function renderOperationalLayer(journey, state) {
  if (!state.detailLayer) return '';
  const chapter =
    journey.chapters.find((item) => item.id === state.selectedChapter) ?? journey.chapters[0];
  return `<div class="operational-backdrop" data-detail-layer="${escapeHtml(state.detailLayer)}"><aside class="operational-layer" role="dialog" aria-modal="true" aria-labelledby="operational-layer-title"><button data-detail-close aria-label="Close details">×</button><p>PRACTICAL PLAN</p><h2 id="operational-layer-title">${escapeHtml(chapter?.title ?? journey.title)}</h2><dl><dt>Timing</dt><dd>${escapeHtml(chapter?.operational?.timing)}</dd><dt>Transit</dt><dd>${escapeHtml(chapter?.operational?.transit)}</dd><dt>Note</dt><dd>${escapeHtml(chapter?.operational?.note)}</dd></dl><p class="indicative-note">Indicative editorial guidance. Final details depend on selected dates and providers.</p></aside></div>`;
}

export function renderJourneyDetail(journey, state, { extra = '' } = {}) {
  return `<main class="agnes-world-page journey-detail" data-journey-id="${escapeHtml(journey.id)}"><section class="journey-hero" data-journey-section="hero">${media(journey.hero.image, journey.title, 'journey-hero-media')}<div class="hero-scrim"></div><div class="journey-hero-copy"><p>${escapeHtml(journey.hero.eyebrow)}</p><h1>${escapeHtml(journey.title)}</h1><h2>${escapeHtml(journey.subtitle)}</h2><div><span>${escapeHtml(journey.duration)}</span><span>${escapeHtml(journey.region)}</span><span>${escapeHtml(journey.mode.toUpperCase())}</span></div><button data-open-layer="day-plan">See the practical plan</button></div></section>${renderMoments(journey)}${renderRoute(journey)}${renderChapters(journey)}${extra}<section class="journey-section agnes-inline" data-journey-section="agnes"><p>AGNES</p><h2>Make this journey yours.</h2><button data-agnes-open>Adapt with AGNES</button></section>${renderInquirySummary(journey)}${renderOperationalLayer(journey, state)}${renderAgnesWorldDock(state)}</main>`;
}
