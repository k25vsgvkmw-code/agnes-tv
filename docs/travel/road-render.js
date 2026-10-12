import {
  renderAgnesWorldDock,
  renderJourneyCard,
  renderJourneyDetail,
} from './cinematic-render.js';

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function roadMatches(journey, state) {
  if (journey.mode !== 'road') return false;
  if (
    state.roadStyle &&
    journey.road?.drivingIntensity !== state.roadStyle &&
    !(journey.styles ?? []).includes(state.roadStyle)
  )
    return false;
  if (
    state.camper &&
    !journey.road?.camperFriendly &&
    journey.type !== 'caravan-road-trip'
  )
    return false;
  return true;
}

export function renderRoadLanding(journeys, state = {}) {
  const list = journeys.filter((journey) => roadMatches(journey, state));
  return `<main class="agnes-world-page mode-v2 road-v2"><section class="collection-hero"><p>BY ROAD</p><h1>The road is part of the story.</h1><span>Routes designed around landscape, pace and the season.</span></section><section class="mode-controls"><label><span>Driving intensity</span><select data-road-style><option value="">Any pace</option><option value="easy" ${state.roadStyle === 'easy' ? 'selected' : ''}>easy</option><option value="balanced" ${state.roadStyle === 'balanced' ? 'selected' : ''}>balanced</option><option value="adventurous" ${state.roadStyle === 'adventurous' ? 'selected' : ''}>adventurous</option></select></label><label class="check-control"><input type="checkbox" data-camper ${state.camper ? 'checked' : ''}><span>Camper-friendly</span></label></section><section class="agnes-collection"><div class="collection-heading"><p>CURATED ROUTES</p><h2>${list.length} road journeys</h2></div><div class="journey-rail">${list.map((journey) => renderJourneyCard(journey)).join('')}</div></section>${renderAgnesWorldDock(state)}</main>`;
}

function renderRoadEditorial(journey) {
  const route = journey.route?.stops ?? [];
  const first = route[0]?.name ?? journey.region;
  const last = route.at(-1)?.name ?? journey.region;
  const middle = route.slice(1, -1).map((stop) => stop.name);
  const bestStops = middle.length ? middle.join(' · ') : journey.region;

  return `<section class="road-editorial" data-road-editorial>
    <div class="road-editorial-intro">
      <p>ROAD JOURNEY</p>
      <h2>Drive the landscape, not just the distance.</h2>
      <span>AGNES shapes the route around the strongest scenery, useful pauses and the season.</span>
    </div>
    <div class="road-editorial-panels">
      <article>
        <p>THE ROAD AHEAD</p>
        <h3>${esc(first)} → ${esc(last)}</h3>
        <span>The route is paced so the road itself stays part of the experience, with room to stop when the landscape deserves it.</span>
      </article>
      <article>
        <p>BEST STOPS</p>
        <h3>${esc(bestStops)}</h3>
        <span>Selected as natural pauses in the journey rather than boxes to tick between destinations.</span>
      </article>
      <article>
        <p>WHY THIS JOURNEY NOW</p>
        <h3>${esc(journey.region)} in season</h3>
        <span>AGNES foregrounds this route when weather, road conditions and scenery are at their strongest.</span>
      </article>
      <article>
        <p>DRIVING RHYTHM</p>
        <h3>${esc(journey.duration)}</h3>
        <span>Balanced driving days, deliberate pauses and enough flexibility to keep the journey from feeling rushed.</span>
      </article>
    </div>
  </section>`;
}

export function renderRoadDetail(journey, state = {}) {
  const extra = `<section class="journey-section mode-specific road-specific"><div class="section-heading"><p>ROAD JOURNEY</p><h2>Move slowly enough to notice the route.</h2></div><p>Driving intensity: ${esc(journey.road?.drivingIntensity ?? 'curated')}</p><button data-provider-action="road">Plan with AGNES</button></section>`;
  const html = renderJourneyDetail(journey, state, { extra });
  return html
    .replace(
      'class="agnes-world-page journey-detail"',
      'class="agnes-world-page journey-detail is-road"',
    )
    .replace(
      '<section class="signature-moments">',
      `${renderRoadEditorial(journey)}<section class="signature-moments">`,
    );
}
