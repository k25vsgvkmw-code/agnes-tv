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

function railMatches(journey, state) {
  if (journey.mode !== 'rail') return false;
  if (state.originId && !(journey.originIds ?? []).includes(state.originId)) return false;
  if (
    state.railStyle &&
    journey.rail?.serviceType !== state.railStyle &&
    !(journey.styles ?? []).includes(state.railStyle)
  )
    return false;
  return true;
}

export function renderRailLanding(journeys, state = {}) {
  const list = journeys.filter((journey) => railMatches(journey, state));
  return `<main class="agnes-world-page mode-v2 rail-v2"><section class="collection-hero"><p>BY RAIL</p><h1>See the world at ground level.</h1><span>Rail journeys chosen for the season, not the algorithm.</span></section><section class="mode-controls"><label><span>Departing from</span><input data-origin-input value="${esc(state.originId)}" placeholder="Station or city"></label><label><span>Rail style</span><select data-rail-style><option value="">Any style</option><option value="scenic" ${state.railStyle === 'scenic' ? 'selected' : ''}>scenic</option><option value="sleeper" ${state.railStyle === 'sleeper' ? 'selected' : ''}>sleeper</option><option value="high-speed" ${state.railStyle === 'high-speed' ? 'selected' : ''}>high-speed</option></select></label></section><section class="agnes-collection"><div class="collection-heading"><p>RIGHT NOW</p><h2>${list.length} rail journeys</h2></div><div class="journey-rail">${list.map((journey) => renderJourneyCard(journey)).join('')}</div></section>${renderAgnesWorldDock(state)}</main>`;
}

function renderRailEditorial(journey) {
  const route = journey.route?.stops ?? [];
  const first = route[0]?.name ?? journey.region;
  const last = route.at(-1)?.name ?? journey.region;
  const middle = route[Math.floor(route.length / 2)]?.name ?? journey.region;

  return `<section class="rail-editorial" data-rail-editorial>
    <div class="rail-editorial-intro">
      <p>RAIL JOURNEY</p>
      <h2>Slow travel, edited by AGNES.</h2>
      <span>Not just a way to arrive. The changing landscape is part of the journey.</span>
    </div>
    <div class="rail-editorial-panels">
      <article>
        <p>THE VIEW FROM THE WINDOW</p>
        <h3>${esc(first)} → ${esc(last)}</h3>
        <span>Watch the world change at human speed, with ${esc(middle)} as part of the story rather than a stop to rush through.</span>
      </article>
      <article>
        <p>WHY THIS JOURNEY NOW</p>
        <h3>${esc(journey.region)} in season</h3>
        <span>AGNES prioritises this journey when the route, light and landscape are at their strongest.</span>
      </article>
      <article>
        <p>THE RHYTHM</p>
        <h3>${esc(journey.duration)}</h3>
        <span>Long views, deliberate pauses and enough time to arrive without turning the trip into a checklist.</span>
      </article>
    </div>
  </section>`;
}

export function renderRailDetail(journey, state = {}) {
  const extra = `<section class="journey-section mode-specific rail-specific"><div class="section-heading"><p>RAIL JOURNEY</p><h2>The route is part of the story.</h2></div><p>Service style: ${esc(journey.rail?.serviceType ?? 'curated rail')}</p><button data-provider-action="rail">Plan with AGNES</button></section>`;
  const html = renderJourneyDetail(journey, state, { extra });
  return html
    .replace(
      'class="agnes-world-page journey-detail"',
      'class="agnes-world-page journey-detail is-rail"',
    )
    .replace('<section class="signature-moments">', `${renderRailEditorial(journey)}<section class="signature-moments">`);
}
