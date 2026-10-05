export function scoreDestination(d, filters = {}) {
  let score = Number(d.baseScore || 0);
  if (d.access === 'direct') score += 8;
  if (filters.tripType && d.tripTypes?.includes(filters.tripType)) score += 12;
  if (filters.maxFare && d.liveFareEur && d.liveFareEur <= filters.maxFare) score += 10;
  if (filters.directOnly && d.access !== 'direct') score -= 100;
  return score;
}

export function rankDestinations(destinations, filters = {}) {
  return [...destinations]
    .map((d) => ({ ...d, score: scoreDestination(d, filters) }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
