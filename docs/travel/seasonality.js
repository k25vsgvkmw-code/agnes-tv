const RANK = { 'in-season': 0, 'coming-next': 1, 'year-round': 2, 'off-season': 3 };

function validMonth(month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('month must be 1..12');
  }
}

function has(list, month) {
  return Array.isArray(list) && list.includes(month);
}

function nextMonths(month) {
  return [(month % 12) + 1, ((month + 1) % 12) + 1];
}

export function classifyJourneySeason(journey, month) {
  validMonth(month);
  const event = has(journey.eventMonths, month);
  if (has(journey.avoidMonths, month) && !event) return 'off-season';
  if (event || has(journey.bestMonths, month) || has(journey.shoulderMonths, month)) {
    return 'in-season';
  }
  if (journey.yearRound) return 'year-round';
  if (
    nextMonths(month).some(
      (candidate) => has(journey.bestMonths, candidate) || has(journey.eventMonths, candidate),
    )
  ) {
    return 'coming-next';
  }
  return 'off-season';
}

export function rankJourneysForMonth(journeys, month) {
  validMonth(month);
  return [...journeys].sort((a, b) => {
    const classA = classifyJourneySeason(a, month);
    const classB = classifyJourneySeason(b, month);
    return (
      RANK[classA] - RANK[classB] ||
      (b.editorialPriority ?? 0) - (a.editorialPriority ?? 0) ||
      a.title.localeCompare(b.title)
    );
  });
}

export function getSeasonalCollections(journeys, month) {
  validMonth(month);
  const ranked = rankJourneysForMonth(journeys, month);
  return {
    rightNow: ranked.filter((journey) => classifyJourneySeason(journey, month) === 'in-season'),
    comingNext: ranked.filter((journey) => classifyJourneySeason(journey, month) === 'coming-next'),
    yearRound: ranked.filter((journey) => classifyJourneySeason(journey, month) === 'year-round'),
  };
}
