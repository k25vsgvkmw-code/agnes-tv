import { renderAgnesWorldDock, renderJourneyCard } from './cinematic-render.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

export function renderSearchPage(results, state = {}, facets = {}) {
  const modes = facets.modes ?? ['air', 'sea', 'rail', 'road'];
  const regions = facets.regions ?? ['Greece', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
  const feelings = facets.feelings ?? [];

  return `<main class="agnes-world-page search-page" data-view="search"><section class="search-hero"><p>AGNES WORLD SEARCH</p><h1>Search the world.</h1><form data-global-search-form><label><span>Where, how or what kind of journey?</span><input data-global-search-input name="q" value="${escapeHtml(state.query ?? '')}" placeholder="Japan by rail, islands in October, cruises from Limassol…"></label><button type="submit">Search</button></form></section><section class="search-layout"><aside class="search-filters" data-search-filter><p>REFINE</p><label><span>Travel mode</span><select name="mode"><option value="">Any mode</option>${modes.map((mode) => option(mode, mode.toUpperCase(), state.mode)).join('')}</select></label><label><span>Region</span><select name="region"><option value="">Anywhere</option>${regions.map((region) => option(region, region, state.region)).join('')}</select></label><label><span>Feeling</span><select name="feeling"><option value="">Any feeling</option>${feelings.map((feeling) => option(feeling, feeling, state.feeling)).join('')}</select></label></aside><section class="search-results"><div class="collection-heading"><p>${results.length} MATCHING JOURNEYS</p><h2>${state.query ? `For “${escapeHtml(state.query)}”` : 'Explore with filters'}</h2></div><div class="journey-rail search-result-rail">${results.map((journey) => renderJourneyCard(journey)).join('')}</div>${results.length === 0 ? '<div class="search-empty"><h3>No curated match yet.</h3><p>Try a broader region, month or travel mode.</p></div>' : ''}</section></section>${renderAgnesWorldDock(state)}</main>`;
}
