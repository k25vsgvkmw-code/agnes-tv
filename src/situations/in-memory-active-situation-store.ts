import type { ActiveSituationStore } from './active-situation-store.js';
import type { LiveSituation } from './live-situation.js';

export class InMemoryActiveSituationStore implements ActiveSituationStore {
  private readonly byFingerprint = new Map<string, LiveSituation>();

  async getByFingerprint(fingerprint: string): Promise<LiveSituation | undefined> {
    return this.byFingerprint.get(fingerprint);
  }

  async upsert(situation: LiveSituation): Promise<LiveSituation> {
    const existing = this.byFingerprint.get(situation.fingerprint);
    if (existing === undefined) {
      const activated: LiveSituation = {
        ...situation,
        state: 'ACTIVE',
      };
      this.byFingerprint.set(situation.fingerprint, activated);
      return activated;
    }

    const updated: LiveSituation = {
      ...situation,
      id: existing.id,
      detectedAt: existing.detectedAt,
      state: 'UPDATED',
    };
    this.byFingerprint.set(situation.fingerprint, updated);
    return updated;
  }

  async resolve(fingerprint: string, resolvedAt: Date): Promise<LiveSituation | undefined> {
    const existing = this.byFingerprint.get(fingerprint);
    if (existing === undefined) {
      return undefined;
    }

    this.byFingerprint.delete(fingerprint);
    return {
      ...existing,
      state: 'RESOLVED',
      updatedAt: new Date(resolvedAt),
    };
  }

  async expireBefore(now: Date): Promise<readonly LiveSituation[]> {
    const expired = [...this.byFingerprint.values()]
      .filter((situation) => situation.expiresAt.getTime() <= now.getTime())
      .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint))
      .map((situation) => ({
        ...situation,
        state: 'EXPIRED' as const,
        updatedAt: new Date(now),
      }));

    for (const situation of expired) {
      this.byFingerprint.delete(situation.fingerprint);
    }

    return expired;
  }
}
