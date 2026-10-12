import { renderAgnesWorldDock, renderJourneyCard, renderJourneyDetail } from './cinematic-render.js';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function roadMatches(journey, state) {
  if (journey.mode !== 'road') return false;
  if (state.roadStyle && journey.road?.drivingIntensity !== state.roadStyle && !(journey.styles ?? []).includes(state.roadStyle)) return false;
  if (state.camper && !journey.road?.camperFriendly && journey.type !== 'caravan-road-trip') return false;
  return true;
}

export function renderRoadLanding(journeys, state = {}) {
  const list = journeys.filter((journey) => roadMatches(journey, state));
  return `<main class="agnes-world-page mode-v2 road-v2"><section class="collection-hero"><p>BY ROAD</p><h1>The road is part of the story.</h1><span>Routes designed around landscape, pace and the season.</span></section><section class="mode-controls"><label><span>Driving intensity</span><select data-road-style><option value="">Any pace</option><option value="easy" ${state.roadStyle === 'easy' ? 'selected' : ''}>easy</option><option value="balanced" ${state.roadStyle === 'balanced' ? 'selected' : ''}>balanced</option><option value="adventurous" ${state.roadStyle === 'adventurous' ? 'selected' : ''}>adventurous</option></select></label><label class="check-control"><input type="checkbox" data-camper ${state.camper ? 'checked' : ''}><span>Camper-friendly</span></label></section><section class="agnes-collection"><div class="collection-heading"><p>CURATED ROUTES</p><h2>${list.length} road journeys</h2></div><div class="journey-rail">${list.map((journey) => renderJourneyCard(journey)).join('')}</div></section>${renderAgnesWorldDock(state)}</main>`;
}

export function renderRoadDetail(journey, state = {}) {
  const extra = `<section class="journey-section mode-specific road-specific"><div class="section-heading"><p>ROAD JOURNEY</p><h2>Move slowly enough to notice the route.</h2></div><p>Driving intensity: ${esc(journey.road?.drivingIntensity ?? 'curated')}</p><button data-provider-action="road">Plan with AGNES</button></section>`;
  return renderJourneyDetail(journey, state, { extra });
}
