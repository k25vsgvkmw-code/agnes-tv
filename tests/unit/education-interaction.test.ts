import { describe, expect, it } from 'vitest';
import { clearLearnerLayer, createEmptyPageState } from '../../src/education/interaction.js';

describe('education interaction overlay', () => {
  it('starts with empty learner-created state', () => {
    const state = createEmptyPageState('vasilis', 'math-c-01-p1');
    expect(state.strokes).toEqual([]);
    expect(state.typedAnswers).toEqual({});
    expect(state.selections).toEqual({});
    expect(state.dragDrop).toEqual({});
    expect(state.version).toBe(0);
  });

  it('clears learner work without changing page identity or optimistic version', () => {
    const state = {
      ...createEmptyPageState('vasilis', 'math-c-01-p1'),
      typedAnswers: { a1: '37' },
      selections: { a2: ['choice-1'] },
      version: 4,
    };

    const cleared = clearLearnerLayer(state);

    expect(cleared.pageId).toBe('math-c-01-p1');
    expect(cleared.learnerId).toBe('vasilis');
    expect(cleared.typedAnswers).toEqual({});
    expect(cleared.selections).toEqual({});
    expect(cleared.version).toBe(4);
  });
});
