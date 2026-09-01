import { describe, expect, it } from 'vitest';
import { getLearnerProfile } from '../../src/education/learner-profile.js';

describe('education learner profiles', () => {
  it('maps Vasilis to Γ΄ and Elenios to Α΄', () => {
    expect(getLearnerProfile('vasilis').grade).toBe('C');
    expect(getLearnerProfile('elenios').grade).toBe('A');
  });

  it('rejects an unknown learner', () => {
    expect(() => getLearnerProfile('unknown')).toThrow('Unknown learner');
  });
});
