import { rankJourneys } from './ranking-v2.js';
import { matchesJourneyRegion } from './journey-region.js';

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const words = (value) => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export function buildSearchIndex(catalog) {
  const destinations = new Map((catalog?.destinations ?? []).map((item) => [item.id, item]));
  const origins = new Map((catalog?.origins ?? []).map((item) => [item.id, item]));

  return (catalog?.journeys ?? []).map((journey) => {
    const journeyDestinations = (journey.destinationIds ?? [])
      .map((id) => destinations.get(id))
      .filter(Boolean);
    const journeyOrigins = (journey.originIds ?? []).map((id) => origins.get(id)).filter(Boolean);
    const fields = [
      journey.id,
      journey.title,
      journey.subtitle,
      journey.mode,
      journey.type,
      journey.region,
      ...(journey.countries ?? []),
      journey.country,
      ...(journey.feelings ?? []),
      ...(journey.styles ?? []),
      ...journeyDestinations.flatMap((item) => [
        item.name,
        item.countryName,
        item.region,
        item.subregion,
        ...(item.tags ?? []),
        ...(item.types ?? []),
      ]),
      ...journeyOrigins.flatMap((item) => [
        item.name,
        item.city,
        item.countryCode,
        item.code,
        item.type,
      ]),
    ];
    const text = normalize(fields.filter(Boolean).join(' '));
    return {
      id: journey.id,
      journey,
      text,
      tokens: new Set(words(text)),
    };
  });
}

function matchesFilters(journey, filters) {
  if (filters.mode && journey.mode !== filters.mode) return false;
  if (filters.type && journey.type !== filters.type) return false;
  if (filters.region && !matchesJourneyRegion(journey.region, filters.region)) return false;
  if (filters.country) {
    const countries = [...(journey.countries ?? []), journey.country].filter(Boolean).map(normalize);
    if (!countries.includes(normalize(filters.country))) return false;
  }
  if (filters.originId && !(journey.originIds ?? []).includes(filters.originId)) return false;
  if (filters.feeling && !(journey.feelings ?? []).includes(filters.feeling)) return false;
  if (filters.style && !(journey.styles ?? []).includes(filters.style)) return false;
  return true;
}

export function searchJourneys(index, query = '', filters = {}) {
  const terms = words(query);
  const matches = (index ?? [])
    .filter((entry) => matchesFilters(entry.journey, filters))
    .filter((entry) => terms.length === 0 || terms.every((term) => entry.text.includes(term)))
    .map((entry) => entry.journey);

  return rankJourneys(matches, {
    month: filters.month,
    mode: filters.mode,
    originId: filters.originId,
    durationDays: filters.durationDays,
    feelings: asList(filters.feeling ?? filters.feelings),
    styles: asList(filters.style ?? filters.styles),
  });
}

export function getSearchFacets(index) {
  const journeys = (index ?? []).map((entry) => entry.journey);
  const unique = (values) => [...new Set(values.filter(Boolean))].sort();
  return {
    modes: unique(journeys.map((journey) => journey.mode)),
    regions: unique(journeys.map((journey) => journey.region)),
    feelings: unique(journeys.flatMap((journey) => journey.feelings ?? [])),
    styles: unique(journeys.flatMap((journey) => journey.styles ?? [])),
  };
}
