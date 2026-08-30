import type {
  PresenceEvidence,
  PresenceEvidenceSource,
  PresenceState,
  PresenceStateName,
} from './presence-state.js';

const SOURCE_WEIGHTS: Readonly<Record<PresenceEvidenceSource, number>> = {
  MANUAL: 1,
  LOCATION: 0.9,
  HOME_WIFI: 0.8,
  NEARBY: 0.7,
  INTERACTION: 0.4,
  CALENDAR: 0.2,
};

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function uniqueSources(evidence: readonly PresenceEvidence[]): readonly PresenceEvidenceSource[] {
  return [...new Set(evidence.map((item) => item.source))];
}

function earliestExpiry(evidence: readonly PresenceEvidence[]): Date | undefined {
  if (evidence.length === 0) return undefined;
  return new Date(Math.min(...evidence.map((item) => item.expiresAt.getTime())));
}

function createState(
  state: PresenceStateName,
  confidence: number,
  evidence: readonly PresenceEvidence[],
): PresenceState {
  const expiresAt = earliestExpiry(evidence);
  const base = {
    state,
    confidence: clampConfidence(confidence),
    sources: uniqueSources(evidence),
  } as const;

  return expiresAt === undefined ? base : { ...base, expiresAt };
}

function scoreEvidence(evidence: PresenceEvidence): number {
  return SOURCE_WEIGHTS[evidence.source] * clampConfidence(evidence.confidence);
}

export function resolvePresence(
  evidence: readonly PresenceEvidence[],
  now: Date,
): PresenceState {
  const fresh = evidence.filter((item) => item.expiresAt.getTime() > now.getTime());

  if (fresh.length === 0) {
    return createState('UNKNOWN', 0, []);
  }

  const manual = fresh
    .filter((item) => item.source === 'MANUAL')
    .sort((left, right) => right.observedAt.getTime() - left.observedAt.getTime())[0];

  if (manual !== undefined) {
    return createState(manual.state, clampConfidence(manual.confidence), [manual]);
  }

  if (fresh.every((item) => item.source === 'CALENDAR')) {
    return createState('UNKNOWN', 0, fresh);
  }

  const scoredStates = new Map<PresenceStateName, number>();
  for (const item of fresh) {
    if (item.state === 'UNKNOWN') continue;
    const score = scoreEvidence(item);
    const current = scoredStates.get(item.state) ?? 0;
    if (score > current) scoredStates.set(item.state, score);
  }

  const ranked = [...scoredStates.entries()]
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1]);

  const winner = ranked[0];
  if (winner === undefined) {
    return createState('UNKNOWN', 0, fresh);
  }

  const runnerUp = ranked[1];
  if (runnerUp !== undefined && winner[1] - runnerUp[1] <= 0.15) {
    const conflictEvidence = fresh.filter(
      (item) => item.state === winner[0] || item.state === runnerUp[0],
    );
    return createState('UNKNOWN', 0, conflictEvidence);
  }

  const winningEvidence = fresh.filter((item) => item.state === winner[0]);
  return createState(winner[0], winner[1], winningEvidence);
}
