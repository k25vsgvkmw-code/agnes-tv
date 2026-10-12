const MONTHS = new Map([
  ['january', 1], ['february', 2], ['march', 3], ['april', 4], ['may', 5], ['june', 6],
  ['july', 7], ['august', 8], ['september', 9], ['october', 10], ['november', 11], ['december', 12],
]);

const ORIGINS = [
  ['limassol', 'port-limassol'],
  ['piraeus', 'port-piraeus'],
  ['athens', 'road-athens'],
  ['zurich', 'station-zurich'],
  ['tokyo', 'station-tokyo'],
  ['larnaca', 'airport-larnaca'],
];

function normalise(message) {
  return String(message ?? '').trim().toLowerCase();
}

function extractPatch(text, state = {}) {
  const patch = {};
  const days = text.match(/\b(\d{1,2})\s*days?\b/);
  if (days) patch.durationDays = Number(days[1]);

  for (const [name, value] of MONTHS) {
    if (text.includes(name)) patch.month = value;
  }

  if (/\b(by sea|cruise|sail|islands?)\b/.test(text)) patch.mode = 'sea';
  if (/\b(by rail|by train|train|rail)\b/.test(text)) patch.mode = 'rail';
  if (/\b(road trip|by road|drive|driving|caravan|camper)\b/.test(text)) patch.mode = 'road';
  if (/\b(by air|flight|fly|flying)\b/.test(text)) patch.mode = 'air';

  for (const [name, id] of ORIGINS) {
    if (text.includes(name)) patch.originId = id;
  }

  if (/less driving|easy driving|less time driving/.test(text)) patch.drivingPace = 'easy';
  if (/romantic/.test(text)) patch.feeling = 'romantic';
  if (/quiet|slow/.test(text)) patch.feeling = patch.feeling || 'slow';
  if (/mountain/.test(text)) patch.style = 'scenic';
  if (/compare/.test(text)) patch.view = 'compare';

  if (/warmer next month/.test(text)) {
    patch.month = ((Number(state.month) || new Date().getMonth() + 1) % 12) + 1;
    patch.feeling = 'seasonal';
  }

  return patch;
}

function matchesCatalog(catalog, patch) {
  return (catalog ?? []).filter((journey) => {
    if (patch.mode && journey.mode !== patch.mode) return false;
    if (patch.originId && !(journey.originIds ?? []).includes(patch.originId)) return false;
    if (patch.feeling && !(journey.feelings ?? []).includes(patch.feeling)) return false;
    if (patch.month && journey.bestMonths?.length && !journey.bestMonths.includes(patch.month)) return false;
    return true;
  });
}

export function planWithAgnes(message, context = {}) {
  const text = normalise(message);
  const state = context.state ?? {};
  const statePatch = extractPatch(text, state);
  const matches = matchesCatalog(context.catalog ?? [], statePatch).slice(0, 6);
  const understood = Object.keys(statePatch).length > 0;

  if (!understood) {
    return {
      statePatch: {},
      reply: 'I can narrow this by month, travel mode, origin, duration, pace or travel feeling.',
      matches: [],
      nextAction: 'clarify',
    };
  }

  const changes = [];
  if (statePatch.mode) changes.push(`travel by ${statePatch.mode}`);
  if (statePatch.month) changes.push(`month ${statePatch.month}`);
  if (statePatch.durationDays) changes.push(`${statePatch.durationDays} days`);
  if (statePatch.originId) changes.push(`origin ${statePatch.originId.replaceAll('-', ' ')}`);
  if (statePatch.drivingPace === 'easy') changes.push('less driving');
  if (statePatch.feeling) changes.push(`${statePatch.feeling} feeling`);

  return {
    statePatch,
    reply: changes.length
      ? `I adjusted the journey toward ${changes.join(', ')}.`
      : 'I adjusted the journey using the constraints I can support.',
    matches,
    nextAction: matches.length ? 'show-matches' : 'refine',
  };
}
