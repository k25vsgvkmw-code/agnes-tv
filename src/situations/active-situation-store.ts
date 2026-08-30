import type { LiveSituation } from './live-situation.js';

export interface ActiveSituationStore {
  getByFingerprint(fingerprint: string): Promise<LiveSituation | undefined>;
  upsert(situation: LiveSituation): Promise<LiveSituation>;
  resolve(fingerprint: string, resolvedAt: Date): Promise<LiveSituation | undefined>;
  expireBefore(now: Date): Promise<readonly LiveSituation[]>;
}
