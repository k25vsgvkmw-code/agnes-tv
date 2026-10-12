const ALLOWED_VALUES = {
  style: new Set(['classic', 'suv', 'boutique', 'nature']),
  duration: new Set([4, 5]),
  audience: new Set(['couple', 'family']),
  drivingPace: new Set(['balanced', 'relaxed']),
  stayTier: new Set(['boutique', 'premium']),
  weatherMode: new Set(['normal', 'rain']),
};

export function createTripState(tripId = 'zagori-autumn') {
  return {
    tripId,
    style: 'classic',
    duration: 5,
    audience: 'couple',
    drivingPace: 'balanced',
    stayTier: 'boutique',
    weatherMode: 'normal',
    selectedDay: 'departure',
    agnesHistory: [],
  };
}

export function applyTripStatePatch(state, patch) {
  const next = { ...state, agnesHistory: [...state.agnesHistory] };

  for (const [key, allowed] of Object.entries(ALLOWED_VALUES)) {
    if (Object.hasOwn(patch, key) && allowed.has(patch[key])) {
      next[key] = patch[key];
    }
  }

  if (typeof patch.selectedDay === 'string' && patch.selectedDay.trim()) {
    next.selectedDay = patch.selectedDay;
  }

  if (Array.isArray(patch.agnesHistory)) {
    next.agnesHistory = [...patch.agnesHistory];
  }

  return next;
}

function cloneDay(day) {
  return {
    ...day,
    driving: day.driving ? { ...day.driving } : undefined,
    timeline: day.timeline.map((item) => ({ ...item })),
    stay: day.stay ? { ...day.stay } : undefined,
  };
}

export function deriveVisibleItinerary(trip, state) {
  let itinerary = trip.itinerary.map(cloneDay);

  if (state.duration === 4) {
    itinerary = itinerary.filter((day) => day.id !== 'day-5');
  }

  if (state.drivingPace === 'relaxed') {
    itinerary = itinerary.map((day) => {
      if (day.id !== 'day-2') return day;
      return {
        ...day,
        paceNote: 'Χαλαρός ρυθμός · λιγότερες στάσεις',
        timeline: day.timeline.slice(0, -1),
      };
    });
  }

  return itinerary;
}
