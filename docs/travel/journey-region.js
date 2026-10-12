const AMERICAS = new Set(['Americas', 'North America', 'South America']);

export function matchesJourneyRegion(journeyRegion, selectedRegion) {
  if (!selectedRegion) return true;
  if (selectedRegion === 'Americas') return AMERICAS.has(journeyRegion);
  return journeyRegion === selectedRegion;
}
