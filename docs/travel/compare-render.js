import { renderAgnesWorldDock, renderJourneyCard } from './cinematic-render.js';

function selectedJourneys(journeys, ids = []) {
  const byId = new Map(journeys.map((journey) => [journey.id, journey]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export function renderSavedPage(journeys, state = {}) {
  const saved = selectedJourneys(journeys, state.saved ?? []);
  const compared = selectedJourneys(journeys, state.compare ?? []).slice(0, 3);
  return `<main class="agnes-world-page saved-page"><section class="collection-hero"><p>SAVED</p><h1>Saved journeys</h1><span>Keep the journeys that deserve another look.</span></section><section class="agnes-collection"><div class="collection-heading"><p>YOUR SHORTLIST</p><h2>${saved.length} saved</h2></div><div class="journey-rail">${saved.map((journey) => renderJourneyCard(journey)).join('')}</div></section><section class="compare-section"><div class="collection-heading"><p>COMPARE</p><h2>Compare up to 3</h2></div><div class="compare-grid">${compared.map((journey) => `<article data-compare-id="${journey.id}"><h3>${journey.title}</h3><p>${journey.region} · ${journey.mode.toUpperCase()}</p><span>${journey.duration ?? ''}</span><button data-journey-id="${journey.id}">View journey</button></article>`).join('')}</div></section>${renderAgnesWorldDock(state)}</main>`;
}

export function renderComparePage(journeys, state = {}) {
  return renderSavedPage(journeys, state);
}
