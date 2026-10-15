import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EducationVersionConflictError } from '../../src/education/education-repository.js';
import { createEmptyPageState } from '../../src/education/interaction.js';
import { PostgresEducationRepository } from '../../src/persistence/postgres-education-repository.js';
import { pool } from '../../src/persistence/postgres.js';

const repository = new PostgresEducationRepository(pool);
const repositoryTestPageId = 'repo-test-page';

beforeAll(async () => {
  await pool.query('delete from education_page_state where page_id = $1', [repositoryTestPageId]);
  await pool.query("delete from education_resume where learner_id = 'elenios'");
});

afterAll(async () => {
  await pool.end();
});

describe('postgres education repository', () => {
  it('increments the page-state version and rejects a stale autosave', async () => {
    const initial = createEmptyPageState('vasilis', repositoryTestPageId);

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

  it('stores and restores resume state for a learner', async () => {
    await repository.saveResumeState({
      learnerId: 'elenios',
      resourceId: 'math-a-01',
      pageId: 'math-a-01-p1',
      activityId: 'math-a-01-a1',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });

    const resume = await repository.getResumeState('elenios');
    expect(resume).toMatchObject({
      learnerId: 'elenios',
      resourceId: 'math-a-01',
      pageId: 'math-a-01-p1',
      activityId: 'math-a-01-a1',
    });
  });
});
