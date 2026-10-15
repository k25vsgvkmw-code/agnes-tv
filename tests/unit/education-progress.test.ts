import { describe, expect, it } from 'vitest';
import { completeActivity, createEmptyProgress } from '../../src/education/progress.js';

describe('education progress rewards', () => {
  it('awards one star only for the first valid completion', () => {
    const initial = createEmptyProgress('vasilis');
    const once = completeActivity(initial, 'a1', { status: 'correct' });
    const twice = completeActivity(once, 'a1', { status: 'correct' });

    expect(once.stars).toBe(1);
    expect(twice.stars).toBe(1);
    expect(twice.completedActivityIds).toEqual(['a1']);
  });

  it('does not reward an incorrect answer', () => {
    const result = completeActivity(createEmptyProgress('elenios'), 'a2', {
      status: 'incorrect',
    });
    expect(result.stars).toBe(0);
    expect(result.completedActivityIds).toEqual([]);
  });
});
