export type FreshnessState = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNKNOWN';

export function evaluateFreshness(
  observedAt: Date | null,
  expiresAt: Date | null,
  now: Date,
): FreshnessState {
  if (observedAt === null || expiresAt === null) {
    return 'UNKNOWN';
  }

  const observedTime = observedAt.getTime();
  const expiresTime = expiresAt.getTime();
  const nowTime = now.getTime();

  if (
    Number.isNaN(observedTime) ||
    Number.isNaN(expiresTime) ||
    Number.isNaN(nowTime) ||
    expiresTime <= observedTime ||
    expiresTime <= nowTime
  ) {
    return 'EXPIRED';
  }

  const lifetime = expiresTime - observedTime;
  const age = Math.max(0, nowTime - observedTime);
  return age / lifetime > 0.75 ? 'STALE' : 'FRESH';
}
