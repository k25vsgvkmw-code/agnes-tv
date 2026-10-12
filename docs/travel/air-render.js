import { renderAgnesWorldDock, renderJourneyCard, renderJourneyDetail } from './cinematic-render.js';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function durationDays(journey) {
  if (Number.isFinite(journey.durationDays)) return journey.durationDays;
  const match = String(journey.duration ?? '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function airMatches(journey, state) {
  if (journey.mode !== 'air') return false;
  if (state.originId && !(journey.originIds ?? []).includes(state.originId)) return false;
  if (state.durationDays) {
    const days = durationDays(journey);
    if (days && Math.abs(days - Number(state.durationDays)) > 2) return false;
  }
  return true;
}

export function renderAirLanding(journeys, state = {}) {
  const list = journeys.filter((journey) => airMatches(journey, state));
  return `<main class="agnes-world-page mode-v2 air-v2"><section class="collection-hero"><p>BY AIR</p><h1>Fly far. Arrive inside the journey.</h1><span>Air is the doorway; the experience begins after landing.</span></section><section class="mode-controls"><label><span>Fly from</span><input data-origin-input value="${esc(state.originId)}" placeholder="Airport or city"></label><label><span>Trip length</span><input type="number" min="2" max="30" data-duration-days value="${esc(state.durationDays)}" placeholder="Days"></label></section><section class="agnes-collection"><div class="collection-heading"><p>FLY-IN JOURNEYS</p><h2>${list.length} curated escapes</h2></div><div class="journey-rail">${list.map((journey) => renderJourneyCard(journey)).join('')}</div></section>${renderAgnesWorldDock(state)}</main>`;
}

export function renderAirDetail(journey, state = {}) {
  const extra = `<section class="journey-section mode-specific air-specific"><div class="section-heading"><p>FLY-IN JOURNEY</p><h2>The flight gets you there. AGNES shapes what follows.</h2></div><button data-provider-action="air">Plan with AGNES</button></section>`;
  return renderJourneyDetail(journey, state, { extra });
}
