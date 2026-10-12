function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9α-ω' ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  ιανουαριο: 1,
  φεβρουαριο: 2,
  μαρτιο: 3,
  απριλιο: 4,
  μαιο: 5,
  ιουνιο: 6,
  ιουλιο: 7,
  αυγουστο: 8,
  σεπτεμβριο: 9,
  οκτωβριο: 10,
  νοεμβριο: 11,
  δεκεμβριο: 12,
};

function result(reply, statePatch = {}, focusTarget = 'agnes') {
  return { reply, statePatch, focusTarget };
}

export function handleJourneyAgnesMessage(message, { journey }) {
  const text = normalize(message);

  if (/cruise|κρουαζ/.test(text) && /limassol|λεμεσ/.test(text)) {
    return result(
      'Showing curated cruises departing from Limassol.',
      { view: 'cruises', mode: 'sea', departurePort: 'limassol' },
      'cruises',
    );
  }

  if (/mountain|βουνο/.test(text) && /train|rail|τρεν/.test(text)) {
    return result(
      'I’ll focus on mountain journeys by rail.',
      { view: 'mode', mode: 'rail', feeling: 'mountains' },
      'collection',
    );
  }

  const month = Object.entries(MONTHS).find(([name]) => text.includes(name))?.[1];
  if (/sea|island|νησ/.test(text) && month) {
    return result(
      'I’ll show sea and island journeys for that month.',
      { view: 'mode', mode: 'sea', month, feeling: 'islands' },
      'collection',
    );
  }

  if (/4ημερο|4 ημερο|4 days|four days/.test(text) && journey) {
    return result(
      'I’ll compress the journey while preserving its strongest moments.',
      { duration: '4' },
      'day-plan',
    );
  }

  if (/less driving|λιγοτερη οδηγηση|drive less/.test(text) && journey) {
    return result(
      'I’ll reduce optional driving and protect the signature stops.',
      { drivingPace: 'relaxed' },
      'day-plan',
    );
  }

  if (/romantic|ρομαντικ/.test(text) && journey) {
    return result(
      'I’ll shift the pacing toward quieter, more intimate moments.',
      { audience: 'couple' },
      'journey',
    );
  }

  if (/family|kids|children|παιδι/.test(text) && journey) {
    return result(
      'I’ll adapt pacing and practical detail for a family.',
      { audience: 'family' },
      'day-plan',
    );
  }

  if (/better stays|better hotel|καλυτερα ξενοδοχεια|premium/.test(text) && journey) {
    return result(
      'I’ll prioritise the stronger stay tier where the editorial data supports it.',
      { stayTier: 'premium' },
      'transport',
    );
  }

  if (/rain|βροχ|βρεχει/.test(text) && journey) {
    return result(
      'I’ll activate a rain-aware version of the practical plan.',
      { weatherMode: 'rain' },
      'day-plan',
    );
  }

  return result(
    'I can filter by air, sea, rail or road, show cruises by departure port, change month, or adapt a journey for pace, romance, family, stays and rain. This version does not make bookings or verify real-time availability.',
    {},
    'agnes',
  );
}
