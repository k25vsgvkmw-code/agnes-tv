import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EducationVersionConflictError } from '../../src/education/education-repository.js';
import { createEmptyPageState } from '../../src/education/interaction.js';
import { PostgresEducationRepository } from '../../src/persistence/postgres-education-repository.js';
import { pool } from '../../src/persistence/postgres.js';

const repository = new PostgresEducationRepository(pool);

beforeAll(async () => {
  await pool.query('delete from education_page_state');
  await pool.query('delete from education_resume');
  await pool.query('delete from education_progress');
});

afterAll(async () => {
  await pool.end();
});

describe('postgres education repository', () => {
  it('increments the page-state version and rejects a stale autosave', async () => {
    const initial = createEmptyPageState('vasilis', 'math-c-01-p1');

    const first = await repository.savePageState(initial, 0);
    expect(first.state.version).toBe(1);

    const changed = {
      ...initial,
      typedAnswers: { 'math-c-01-a1': '37' },
    };

    await expect(repository.savePageState(changed, 0)).rejects.toBeInstanceOf(
      EducationVersionConflictError,
    );
  });

  it('stores and restores resume state independently per learner', async () => {
    await repository.saveResumeState({
      learnerId: 'vasilis',
      resourceId: 'math-c-01',
      pageId: 'math-c-01-p1',
      activityId: 'math-c-01-a1',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });

    const resume = await repository.getResumeState('vasilis');
    expect(resume?.pageId).toBe('math-c-01-p1');
    expect(await repository.getResumeState('elenios')).toBeNull();
  });
});
