import { deriveVisibleItinerary } from './trip-state.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function mediaMarkup(image, alt, className = '') {
  if (!image) {
    return `<div class="rt-media rt-media-fallback ${className}" data-image-fallback="true" aria-label="${escapeHtml(alt)}"></div>`;
  }

  return `<div class="rt-media ${className}" data-image-fallback="false"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" data-road-trip-image></div>`;
}

function renderFact(fact, state) {
  const value = fact.label === 'Διάρκεια' ? `${state.duration} νύχτες` : fact.value;
  return `<div class="rt-fact"><span class="rt-fact-icon" aria-hidden="true">${escapeHtml(fact.icon)}</span><span><small>${escapeHtml(fact.label)}</small><strong>${escapeHtml(value)}</strong><em>${escapeHtml(fact.qualifier)}</em></span></div>`;
}

export function renderTripHero(trip, state) {
  const image = mediaMarkup(trip.hero.image, trip.hero.title, 'rt-hero-media');
  const facts = trip.facts.map((fact) => renderFact(fact, state)).join('');

  return `<section class="road-trip-hero" data-road-trip-section="hero">
    ${image}
    <div class="rt-hero-scrim"></div>
    <div class="rt-hero-content">
      <p class="rt-eyebrow">${escapeHtml(trip.hero.eyebrow)}</p>
      <h1>${escapeHtml(trip.hero.title)}</h1>
      <p class="rt-hero-story">${escapeHtml(trip.hero.story)}</p>
      <div class="rt-hero-facts">${facts}</div>
      <button class="rt-primary" type="button" data-road-trip-primary>${escapeHtml(trip.hero.cta)}</button>
    </div>
  </section>`;
}

export function renderSignatureMoments(trip) {
  const cards = trip.signatureMoments
    .map((moment) => {
      return `<article class="rt-signature-card" data-signature-moment="${escapeHtml(moment.id)}">
        ${mediaMarkup(moment.image, moment.title, 'rt-signature-media')}
        <div class="rt-signature-scrim"></div>
        <div class="rt-signature-copy">
          <p>${escapeHtml(moment.label)}</p>
          <h2>${escapeHtml(moment.title)}</h2>
          <span>${escapeHtml(moment.copy)}</span>
        </div>
      </article>`;
    })
    .join('');

  return `<section class="rt-signature-grid" data-road-trip-section="signature-moments">${cards}</section>`;
}

export function renderTripStyles(trip, state) {
  const cards = trip.styles
    .map((style) => {
      const active = style.id === state.style;
      return `<button class="rt-style-card${active ? ' is-active' : ''}" type="button" data-trip-style="${escapeHtml(style.id)}" aria-pressed="${active}">
        <span class="rt-style-icon" aria-hidden="true">${escapeHtml(style.icon)}</span>
        <strong>${escapeHtml(style.title)}</strong>
        <small>${escapeHtml(style.subtitle)}</small>
      </button>`;
    })
    .join('');

  return `<section class="rt-section rt-styles" data-road-trip-section="trip-styles" id="trip-style">
    <div class="rt-section-heading"><div><p class="rt-kicker">ΔΙΑΛΕΞΕ ΤΟ VIBE</p><h2>Επίλεξε το δικό σου στυλ ταξιδιού</h2></div><p>Η επιλογή αλλάζει τον τρόπο που η AGNES προβάλλει διαμονές και στάσεις.</p></div>
    <div class="rt-style-grid">${cards}</div>
  </section>`;
}

export function renderRouteOverview(trip, state) {
  const stops = trip.route.stops
    .map((stop, index) => {
      return `<div class="rt-route-stop" data-route-stop="${escapeHtml(stop.id)}">
        <span class="rt-route-number">${index + 1}</span>
        <strong>${escapeHtml(stop.name)}</strong>
        <small>${escapeHtml(stop.short)}</small>
      </div>`;
    })
    .join('');

  const pace = state.drivingPace === 'relaxed' ? 'Χαλαρός ρυθμός' : 'Ισορροπημένος ρυθμός';

  return `<section class="rt-section rt-route" data-road-trip-section="route" id="route">
    <div class="rt-section-heading"><div><p class="rt-kicker">Η ΔΙΑΔΡΟΜΗ ΣΟΥ</p><h2>Από την άφιξη μέχρι την επιστροφή</h2></div><p>${escapeHtml(pace)}</p></div>
    <div class="rt-route-canvas">
      <div class="rt-route-line" aria-hidden="true"></div>
      <div class="rt-route-stops">${stops}</div>
    </div>
    <div class="rt-route-stats">
      <span><strong>~${escapeHtml(trip.route.totalDistanceKm)} km</strong> συνολικά</span>
      <span><strong>${escapeHtml(trip.route.durationLabel)}</strong></span>
      <span><strong>${escapeHtml(trip.route.regionsLabel)}</strong></span>
      <span><strong>${escapeHtml(trip.route.elevationLabel)}</strong> υψόμετρο</span>
    </div>
  </section>`;
}

function renderTimeline(timeline) {
  return timeline
    .map((item) => {
      return `<li><time>${escapeHtml(item.time)}</time><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.note)}</small></span></li>`;
    })
    .join('');
}

function renderStay(stay, state) {
  if (!stay) return '';
  const premium =
    state.stayTier === 'premium' ? '<span class="rt-premium-pill">Premium focus</span>' : '';
  return `<aside class="rt-stay" data-stay-card>
    ${mediaMarkup(stay.image, stay.title, 'rt-stay-media')}
    <div><p class="rt-kicker">ΠΟΥ ΜΕΝΕΙΣ ΑΠΟΨΕ</p><h4>${escapeHtml(stay.title)}</h4><p>${escapeHtml(stay.detail)}</p>${premium}</div>
  </aside>`;
}

function renderItineraryDay(day, state) {
  const selected = state.selectedDay === day.id;
  const paceNote = day.paceNote ? `<p class="rt-pace-note">${escapeHtml(day.paceNote)}</p>` : '';
  return `<article class="rt-day${selected ? ' is-selected' : ''}" data-itinerary-day="${escapeHtml(day.id)}">
    <div class="rt-day-image-wrap">
      ${mediaMarkup(day.image, day.title, 'rt-day-media')}
      <div class="rt-day-image-copy"><p>${escapeHtml(day.dayLabel)}</p><h3>${escapeHtml(day.title)}</h3><span>${escapeHtml(day.location)}</span></div>
    </div>
    <div class="rt-day-content">
      <p class="rt-day-narrative">${escapeHtml(day.narrative)}</p>
      ${paceNote}
      <div class="rt-driving-meta"><span>🚗 ${escapeHtml(day.driving?.distanceKm ?? '—')} km</span><span>◷ ${escapeHtml(day.driving?.duration ?? '')}</span></div>
      <ol class="rt-timeline">${renderTimeline(day.timeline)}</ol>
      <div class="rt-signature-note"><span>Η στιγμή που αξίζει</span><strong>${escapeHtml(day.signature)}</strong></div>
      ${renderStay(day.stay, state)}
      <div class="rt-agnes-context" data-agnes-context="${escapeHtml(day.id)}"><span class="rt-agnes-dot">A</span><p><strong>AGNES</strong>${escapeHtml(day.agnes)}</p></div>
    </div>
  </article>`;
}

function renderItineraryAdaptation(state) {
  if (state.weatherMode === 'rain') {
    return `<div class="rt-itinerary-adaptation is-rain"><strong>Rain plan ενεργό</strong><span>Η AGNES κρατάμε ευέλικτα τα viewpoints και μετακινεί τις φωτογραφικές στάσεις στο καλύτερο διαθέσιμο παράθυρο.</span></div>`;
  }
  if (state.audience === 'family') {
    return `<div class="rt-itinerary-adaptation"><strong>Family mode</strong><span>Πιο ήπιος ρυθμός, λιγότερες συνεχόμενες στάσεις και πρακτικότερη ροή ημέρας.</span></div>`;
  }
  return '';
}

export function renderItinerary(trip, state) {
  const itinerary = deriveVisibleItinerary(trip, state);
  const nav = itinerary
    .map((day) => {
      const selected = state.selectedDay === day.id;
      return `<button type="button" data-day-select="${escapeHtml(day.id)}" aria-pressed="${selected}">${escapeHtml(day.dayLabel)}</button>`;
    })
    .join('');
  const days = itinerary.map((day) => renderItineraryDay(day, state)).join('');
  const adaptation = renderItineraryAdaptation(state);

  return `<section class="rt-section rt-itinerary" data-road-trip-section="itinerary" id="itinerary">
    <div class="rt-section-heading"><div><p class="rt-kicker">ΤΟ ΠΡΟΓΡΑΜΜΑ ΣΟΥ</p><h2>Από την αναχώρηση μέχρι την επιστροφή</h2></div><p>${state.duration} νύχτες · ${escapeHtml(state.drivingPace === 'relaxed' ? 'relaxed drive' : 'balanced drive')}</p></div>
    ${adaptation}
    <nav class="rt-day-nav" aria-label="Ημέρες ταξιδιού">${nav}</nav>
    <div class="rt-day-list">${days}</div>
  </section>`;
}

export function renderBookingSummary(trip, state) {
  const items = trip.booking.items
    .map(
      (item) =>
        `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></li>`,
    )
    .join('');
  const audience = state.audience === 'family' ? 'Family version' : 'Couple version';

  return `<section class="rt-section rt-booking" data-road-trip-section="booking" id="booking">
    <div class="rt-booking-copy"><p class="rt-kicker">ΤΟ ΤΑΞΙΔΙ ΣΟΥ</p><h2>Έτοιμο να γίνει πραγματικό.</h2><p>${escapeHtml(audience)} · ${escapeHtml(trip.booking.disclaimer)}</p></div>
    <ul class="rt-booking-list">${items}</ul>
    <div class="rt-booking-total"><span>${escapeHtml(trip.booking.priceLabel)}</span><button type="button" class="rt-primary" data-booking-cta>${escapeHtml(trip.booking.cta)} →</button></div>
  </section>`;
}

export function renderAgnesDock(trip, state) {
  const history = state.agnesHistory
    .slice(-2)
    .map((entry) => {
      const role = entry.role === 'agnes' ? 'agnes' : 'user';
      return `<div class="rt-agnes-message is-${role}"><strong>${role === 'agnes' ? 'AGNES' : 'Εσύ'}</strong><span>${escapeHtml(entry.text)}</span></div>`;
    })
    .join('');
  const actions = trip.agnes.quickActions
    .map(
      (action) =>
        `<button type="button" data-agnes-action="${escapeHtml(action)}">${escapeHtml(action)}</button>`,
    )
    .join('');

  return `<aside class="rt-agnes-dock" data-agnes-dock id="agnes">
    <div class="rt-agnes-head"><span class="rt-agnes-avatar" aria-hidden="true">A</span><div><strong>AGNES</strong><small>Road trip copilot</small></div></div>
    <p class="rt-agnes-intro">${escapeHtml(trip.agnes.intro)}</p>
    <div class="rt-agnes-history" aria-live="polite">${history}</div>
    <div class="rt-agnes-actions">${actions}</div>
    <form class="rt-agnes-form" data-agnes-form><input type="text" data-agnes-input autocomplete="off" placeholder="Ρώτησε την AGNES για το ταξίδι σου…"><button type="submit" data-agnes-send aria-label="Αποστολή στην AGNES">↑</button></form>
  </aside>`;
}

export function renderRoadTripDetail(trip, state) {
  return `<div class="road-trip-page" data-road-trip-id="${escapeHtml(trip.id)}">
    ${renderTripHero(trip, state)}
    ${renderSignatureMoments(trip)}
    ${renderTripStyles(trip, state)}
    ${renderRouteOverview(trip, state)}
    ${renderItinerary(trip, state)}
    ${renderBookingSummary(trip, state)}
    ${renderAgnesDock(trip, state)}
  </div>`;
}
