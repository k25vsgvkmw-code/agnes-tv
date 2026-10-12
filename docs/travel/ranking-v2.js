export const RANKING_WEIGHTS = Object.freeze({
  mode: 1000,
  origin: 800,
  cruiseDeparturePort: 300,
  railOriginStation: 300,
  bestMonth: 500,
  shoulderMonth: 180,
  yearRound: 120,
  duration: 320,
  feeling: 240,
  style: 180,
  editorialPriority: 1,
});

const months = (journey, key) => journey.seasonality?.[key] ?? journey[key] ?? [];

export function classifySeason(journey, month) {
  if (months(journey, 'bestMonths').includes(month)) return 'best';
  if (months(journey, 'shoulderMonths').includes(month)) return 'shoulder';
  if (journey.seasonality?.yearRound || journey.yearRound) return 'year-round';
  if (months(journey, 'availableMonths').includes(month)) return 'available';
  return 'off-season';
}

function durationRange(journey) {
  if (journey.duration && typeof journey.duration === 'object') {
    return [journey.duration.minDays ?? 0, journey.duration.maxDays ?? journey.duration.minDays ?? 0];
  }
  const match = String(journey.duration ?? '').match(/\d+/);
  const value = match ? Number(match[0]) : 0;
  return [value, value];
}

function list(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function scoreJourney(journey, context = {}) {
  let score = Number(journey.editorialPriority ?? 0) * RANKING_WEIGHTS.editorialPriority;

  if (context.mode) {
    score += journey.mode === context.mode ? RANKING_WEIGHTS.mode : -RANKING_WEIGHTS.mode;
  }

  if (context.month) {
    const season = classifySeason(journey, context.month);
    if (season === 'best') score += RANKING_WEIGHTS.bestMonth;
    if (season === 'shoulder') score += RANKING_WEIGHTS.shoulderMonth;
    if (season === 'year-round') score += RANKING_WEIGHTS.yearRound;
  }

  if (context.originId) {
    const originMatch = (journey.originIds ?? []).includes(context.originId);
    if (originMatch) {
      score += RANKING_WEIGHTS.origin;
      if (journey.mode === 'sea' && journey.type === 'cruise') {
        score += RANKING_WEIGHTS.cruiseDeparturePort;
      }
      if (journey.mode === 'rail') score += RANKING_WEIGHTS.railOriginStation;
    }
  }

  if (context.durationDays) {
    const [min, max] = durationRange(journey);
    if (min && context.durationDays >= min && context.durationDays <= max) {
      score += RANKING_WEIGHTS.duration;
    }
  }

  for (const feeling of list(context.feelings)) {
    if ((journey.feelings ?? []).includes(feeling)) score += RANKING_WEIGHTS.feeling;
  }
  for (const style of list(context.styles)) {
    if ((journey.styles ?? []).includes(style)) score += RANKING_WEIGHTS.style;
  }

  return score;
}

export function rankJourneys(journeys, context = {}) {
  return [...(journeys ?? [])].sort((a, b) => {
    const delta = scoreJourney(b, context) - scoreJourney(a, context);
    return delta || String(a.id).localeCompare(String(b.id));
  });
}
