export interface DepartureChangeSnapshot {
  readonly requiredDepartureAt?: Date;
  readonly urgency: number;
}

const DEPARTURE_SHIFT_THRESHOLD_MS = 10 * 60 * 1000;
const URGENCY_THRESHOLD = 0.8;

function crossesUrgencyThreshold(previous: number, current: number): boolean {
  return (previous < URGENCY_THRESHOLD && current >= URGENCY_THRESHOLD) ||
    (previous >= URGENCY_THRESHOLD && current < URGENCY_THRESHOLD);
}

export function hasMaterialDepartureChange(
  previous: DepartureChangeSnapshot,
  current: DepartureChangeSnapshot,
): boolean {
  if (previous.requiredDepartureAt === undefined || current.requiredDepartureAt === undefined) {
    if (previous.requiredDepartureAt !== current.requiredDepartureAt) return true;
  } else {
    const shiftMs = Math.abs(
      current.requiredDepartureAt.getTime() - previous.requiredDepartureAt.getTime(),
    );
    if (shiftMs >= DEPARTURE_SHIFT_THRESHOLD_MS) return true;
  }

  return crossesUrgencyThreshold(previous.urgency, current.urgency);
}
