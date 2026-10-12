/* global document, fetch */
import { handleAgnesMessage } from './agnes-trip.js';
import { rankDestinations } from './ranking.js';
import { renderRoadTripDetail } from './road-trip-render.js';
import { ZAGORI_TRIP } from './trip-data.js';
import { applyTripStatePatch, createTripState } from './trip-state.js';

const state = { view: 'home', tripType: '', directOnly: false, search: '' };
const view = document.querySelector('#view');
let destinations = [];
let roadTripState = createTripState(ZAGORI_TRIP.id);

const price = (destination) =>
  destination.liveFareEur ? `€${destination.liveFareEur}` : `score ${destination.baseScore}`;

const card = (destination) => `<article class="card" data-iata="${destination.iata}">
  <div class="photo">${destination.name}</div>
  <div class="card-body">
    <div class="meta"><span>${destination.country}</span><span class="score">${destination.score ?? destination.baseScore}</span></div>
    <h3>${destination.name} · ${destination.iata}</h3>
    <div>${destination.tripTypes
      .slice(0, 3)
      .map((type) => `<span class="tag">${type}</span>`)
      .join('')}</div>
    <p class="meta"><span>${destination.access === 'direct' ? 'Direct' : '1 stop'}</span><span>${price(destination)}</span></p>
  </div>
</article>`;

function roadTripFeatureCard() {
  return `<article class="featured-road-trip" data-road-trip-id="zagori-autumn">
    <img src="${ZAGORI_TRIP.hero.image}" alt="${ZAGORI_TRIP.hero.title}">
    <div class="featured-road-trip-scrim"></div>
    <div class="featured-road-trip-copy">
      <p>ΝΕΟ · ROAD TRIP ΕΛΛΑΔΑΣ</p>
      <h2>${ZAGORI_TRIP.hero.title}</h2>
      <span>${ZAGORI_TRIP.hero.story}</span>
      <button type="button" data-open-road-trip>ΖΗΣΕ ΤΟ ROAD TRIP →</button>
    </div>
  </article>`;
}

function filtered() {
  return rankDestinations(destinations, {
    tripType: state.tripType || undefined,
    directOnly: state.directOnly,
  }).filter((destination) => {
    if (!state.search) return true;
    const haystack = `${destination.name} ${destination.country} ${destination.iata}`.toLowerCase();
    return haystack.includes(state.search.toLowerCase());
  });
}

function home() {
  const top = filtered().slice(0, 8);
  view.innerHTML = `<section class="hero">
    <h1>Πού θα πάμε επόμενο ταξίδι;</h1>
    <p>93 προορισμοί από Λάρνακα · 84 direct + 9 με 1 στάση · ranking με βάση τύπο ταξιδιού, πρόσβαση και value.</p>
    <div class="searchbar">
      <input value="Λάρνακα (LCA)" disabled>
      <select id="tripType"><option value="">Όλοι οι τύποι</option><option>City</option><option>Couple</option><option>Family</option><option>Ski</option><option>Sea</option><option>Christmas</option></select>
      <select id="access"><option value="all">Direct + 1 stop</option><option value="direct">Μόνο Direct</option></select>
      <button class="primary" id="searchBtn">Αναζήτηση</button>
    </div>
  </section>
  <section class="section road-trip-feature-section">
    <p class="section-kicker">FLAGSHIP ΕΜΠΕΙΡΙΑ</p>
    ${roadTripFeatureCard()}
  </section>
  <section class="section"><h2>Καλύτερες προτάσεις τώρα</h2><div class="grid">${top.map(card).join('')}</div></section>`;
  wireHome();
  wireRoadTripEntryPoints();
}

function destinationsView() {
  const list = filtered();
  view.innerHTML = `<section class="section"><h1>Όλοι οι προορισμοί (${list.length})</h1>
    <div class="toolbar">
      <input id="q" placeholder="Αναζήτηση πόλης ή IATA" value="${state.search}">
      <select id="type"><option value="">Όλοι</option><option>City</option><option>Couple</option><option>Family</option><option>Ski</option><option>Sea</option><option>Christmas</option></select>
      <label><input id="direct" type="checkbox" ${state.directOnly ? 'checked' : ''}> μόνο direct</label>
    </div>
    <div class="grid">${list.map(card).join('')}</div>
  </section>`;

  document.querySelector('#q').oninput = (event) => {
    state.search = event.target.value;
    destinationsView();
  };
  document.querySelector('#type').onchange = (event) => {
    state.tripType = event.target.value;
    destinationsView();
  };
  document.querySelector('#direct').onchange = (event) => {
    state.directOnly = event.target.checked;
    destinationsView();
  };
}

function mapView() {
  const seasons = ['Φθινόπωρο', 'Χειμώνας', 'Άνοιξη', 'Καλοκαίρι'];
  const seasonCopy = [
    'City breaks · Σεπ–Νοε',
    'Ski · Δεκ–Φεβ',
    'Nature · Μαρ–Μάι',
    'Sea · Ιουν–Αυγ',
  ];
  view.innerHTML = `<section class="section"><h1>Χάρτης & Εποχές</h1><div class="map"></div><h2 style="margin-top:22px">Καλύτερη εποχή</h2><div class="grid">${seasons
    .map(
      (season, index) =>
        `<div class="card"><div class="photo">${season}</div><div class="card-body"><p>${seasonCopy[index]}</p></div></div>`,
    )
    .join('')}</div></section>`;
}

function pricesView() {
  const days = Array.from({ length: 30 }, (_, index) => {
    const dayPrice = 60 + ((index * 13) % 70);
    const priceClass = dayPrice < 85 ? 'good' : dayPrice < 110 ? 'mid' : 'high';
    return `<div class="day ${priceClass}"><b>${index + 1}</b><br>€${dayPrice}</div>`;
  }).join('');
  view.innerHTML = `<section class="section"><h1>Ημερολόγιο Τιμών</h1><p>Παράδειγμα price calendar για γρήγορη σύγκριση ημερών.</p><div class="calendar">${days}</div></section>`;
}

function compareView() {
  const top = filtered().slice(0, 5);
  view.innerHTML = `<section class="section compare"><h1>Σύγκριση & Φίλτρα</h1><table><thead><tr><th>Προορισμός</th><th>Score</th><th>Access</th><th>Νύχτες</th><th>Fare</th><th>Τύποι</th></tr></thead><tbody>${top
    .map(
      (destination) =>
        `<tr><td>${destination.name}</td><td>${destination.score}</td><td>${destination.access === 'direct' ? 'Direct' : '1 stop'}</td><td>${destination.suggestedNights}</td><td>${destination.liveFareEur ? `€${destination.liveFareEur}` : '—'}</td><td>${destination.tripTypes.slice(0, 3).join(', ')}</td></tr>`,
    )
    .join('')}</tbody></table></section>`;
}

function readyView() {
  const picks = filtered().slice(0, 6);
  view.innerHTML = `<section class="section"><h1>Έτοιμα ταξίδια για εσάς</h1>${roadTripFeatureCard()}<div class="ready-list">${picks
    .map(
      (destination) =>
        `<div class="ready-item"><div class="thumb"></div><div><b>${destination.suggestedNights} νύχτες στη ${destination.name}</b><div class="meta">${destination.tripTypes.slice(0, 3).join(' · ')} · ${destination.access === 'direct' ? 'Direct' : '1 stop'}</div></div><div class="price"><b>${destination.liveFareEur ? `από €${destination.liveFareEur}` : `Score ${destination.score}`}</b></div></div>`,
    )
    .join('')}</div></section>`;
  wireRoadTripEntryPoints();
}

function detail(destination) {
  view.innerHTML = `<section class="hero"><h1>${destination.name}</h1><p>${destination.country} · ${destination.iata} · ${destination.access === 'direct' ? 'Direct από LCA' : '1 stop'}</p></section><section class="section"><div class="grid"><div class="card"><div class="card-body"><h2>AGNES Score ${destination.score ?? destination.baseScore}</h2><p>Προτεινόμενες νύχτες: ${destination.suggestedNights}</p><p>Availability: ${destination.availability}</p>${destination.hub ? `<p>Καλύτερο hub: ${destination.hub}</p>` : ''}</div></div><div class="card"><div class="card-body"><h2>Γιατί να πάμε</h2>${destination.tripTypes.map((type) => `<span class="tag">${type}</span>`).join('')}</div></div></div></section>`;
}

function appendAgnesExchange(message, reply, patch) {
  const history = [
    ...roadTripState.agnesHistory,
    { role: 'user', text: message },
    { role: 'agnes', text: reply },
  ];
  roadTripState = applyTripStatePatch(roadTripState, { ...patch, agnesHistory: history });
}

function runAgnes(message) {
  const cleaned = String(message ?? '').trim();
  if (!cleaned) return;
  const result = handleAgnesMessage(cleaned, ZAGORI_TRIP, roadTripState);
  appendAgnesExchange(cleaned, result.reply, result.statePatch);
  mountRoadTrip(result.focusTarget);
}

function applyImageFallbacks() {
  document.querySelectorAll('[data-road-trip-image]').forEach((image) => {
    image.onerror = () => {
      const media = image.closest('.rt-media');
      if (media) {
        media.dataset.imageFallback = 'true';
        media.classList.add('rt-media-fallback');
      }
      image.remove();
    };
  });
}

function wireRoadTrip() {
  document.querySelectorAll('[data-trip-style]').forEach((button) => {
    button.onclick = () => {
      roadTripState = applyTripStatePatch(roadTripState, { style: button.dataset.tripStyle });
      mountRoadTrip('trip-style');
    };
  });

  document.querySelectorAll('[data-day-select]').forEach((button) => {
    button.onclick = () => {
      roadTripState = applyTripStatePatch(roadTripState, { selectedDay: button.dataset.daySelect });
      mountRoadTrip('itinerary');
    };
  });

  document.querySelectorAll('[data-agnes-action]').forEach((button) => {
    button.onclick = () => runAgnes(button.dataset.agnesAction);
  });

  const agnesForm = document.querySelector('[data-agnes-form]');
  if (agnesForm) {
    agnesForm.onsubmit = (event) => {
      event.preventDefault();
      const input = agnesForm.querySelector('[data-agnes-input]');
      runAgnes(input?.value);
    };
  }

  const heroCta = document.querySelector('[data-road-trip-primary]');
  if (heroCta) {
    heroCta.onclick = () => document.querySelector('#itinerary')?.scrollIntoView({ behavior: 'smooth' });
  }

  const bookingCta = document.querySelector('[data-booking-cta]');
  if (bookingCta) {
    bookingCta.onclick = () => {
      const message = 'Θέλω να προχωρήσω στο booking-inquiry';
      const reply =
        'Το κόστος και η διαθεσιμότητα είναι ενδεικτικά σε αυτή την έκδοση. Μπορώ να κρατήσω τις επιλογές του ταξιδιού σου έτοιμες για το επόμενο βήμα κράτησης.';
      appendAgnesExchange(message, reply, {});
      mountRoadTrip('agnes');
    };
  }

  applyImageFallbacks();
}

function mountRoadTrip(focusTarget = '') {
  document.querySelectorAll('#tabs button').forEach((button) => button.classList.remove('active'));
  view.innerHTML = renderRoadTripDetail(ZAGORI_TRIP, roadTripState);
  wireRoadTrip();

  const focusMap = {
    itinerary: '#itinerary',
    'trip-style': '#trip-style',
    stays: '[data-stay-card]',
    agnes: '#agnes',
    'booking-inquiry': '#booking',
  };
  const selector = focusMap[focusTarget];
  if (selector) document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wireRoadTripEntryPoints() {
  document.querySelectorAll('[data-open-road-trip]').forEach((button) => {
    button.onclick = () => mountRoadTrip();
  });
}

function render() {
  document.querySelectorAll('#tabs button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });

  const views = {
    home: home,
    destinations: destinationsView,
    map: mapView,
    prices: pricesView,
    compare: compareView,
    ready: readyView,
  };
  (views[state.view] || home)();

  document.querySelectorAll('.card[data-iata]').forEach((element) => {
    element.onclick = () => {
      const destination = filtered().find((item) => item.iata === element.dataset.iata);
      if (destination) detail(destination);
    };
  });
}

function wireHome() {
  const tripType = document.querySelector('#tripType');
  const access = document.querySelector('#access');
  const searchButton = document.querySelector('#searchBtn');
  if (!searchButton) return;

  searchButton.onclick = () => {
    state.tripType = tripType.value;
    state.directOnly = access.value === 'direct';
    state.view = 'destinations';
    render();
  };
}

document.querySelectorAll('#tabs button').forEach((button) => {
  button.onclick = () => {
    state.view = button.dataset.view;
    render();
  };
});

Promise.all(
  ['data-1.json', 'data-2.json', 'data-3.json', 'data-4.json'].map((file) =>
    fetch(file).then((response) => response.json()),
  ),
)
  .then((parts) => {
    destinations = parts.flat();
    render();
  })
  .catch(() => {
    view.innerHTML = '<section class="section"><h1>Δεν φορτώθηκαν οι προορισμοί.</h1></section>';
  });
