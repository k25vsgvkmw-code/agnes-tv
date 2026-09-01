import type { LearnerId, LearnerProfile } from './types.js';

const profiles: Record<LearnerId, LearnerProfile> = {
  vasilis: { learnerId: 'vasilis', displayName: 'Βασίλης', grade: 'C' },
  elenios: { learnerId: 'elenios', displayName: 'Ελένιος', grade: 'A' },
};

export function getLearnerProfile(learnerId: string): LearnerProfile {
  const profile = profiles[learnerId as LearnerId];
  if (!profile) {
    throw new Error(`Unknown learner: ${learnerId}`);
  }
  return profile;
}
