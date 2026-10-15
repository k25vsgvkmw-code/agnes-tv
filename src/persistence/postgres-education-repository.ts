import type { Pool } from 'pg';
import {
  EducationVersionConflictError,
  type EducationRepository,
  type SavePageStateResult,
} from '../education/education-repository.js';
import type { PageInteractionState } from '../education/interaction.js';
import type { ResumeState } from '../education/lesson-session.js';
import { createEmptyProgress, type LearnerProgress } from '../education/progress.js';
import type { LearnerId } from '../education/types.js';

interface PageStateRow {
  state: PageInteractionState;
  version: number;
  updated_at: Date;
}

interface JsonStateRow<T> {
  state: T;
}

function toPageState(row: PageStateRow): PageInteractionState {
  return {
    ...row.state,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PostgresEducationRepository implements EducationRepository {
  constructor(private readonly db: Pool) {}

  async getPageState(learnerId: LearnerId, pageId: string): Promise<PageInteractionState | null> {
    const result = await this.db.query<PageStateRow>(
      `select state, version, updated_at
       from education_page_state
       where learner_id = $1 and page_id = $2`,
      [learnerId, pageId],
    );
    const row = result.rows[0];
    return row ? toPageState(row) : null;
  }

  async savePageState(
    state: PageInteractionState,
    expectedVersion: number,
  ): Promise<SavePageStateResult> {
    const storedState = { ...state, version: expectedVersion + 1 };
    let result;

    if (expectedVersion === 0) {
      result = await this.db.query<PageStateRow>(
        `insert into education_page_state(learner_id, page_id, state, version, updated_at)
         values($1, $2, $3::jsonb, 1, now())
         on conflict (learner_id, page_id) do update
         set state = excluded.state,
             version = education_page_state.version + 1,
             updated_at = now()
         where education_page_state.version = 0
         returning state, version, updated_at`,
        [state.learnerId, state.pageId, JSON.stringify(storedState)],
      );
    } else {
      result = await this.db.query<PageStateRow>(
        `update education_page_state
         set state = $3::jsonb,
             version = version + 1,
             updated_at = now()
         where learner_id = $1 and page_id = $2 and version = $4
         returning state, version, updated_at`,
        [state.learnerId, state.pageId, JSON.stringify(storedState), expectedVersion],
      );
    }

    const row = result.rows[0];
    if (!row) {
      throw new EducationVersionConflictError();
    }

    return { state: toPageState(row) };
  }

  async getResumeState(learnerId: LearnerId): Promise<ResumeState | null> {
    const result = await this.db.query<JsonStateRow<ResumeState>>(
      'select state from education_resume where learner_id = $1',
      [learnerId],
    );
    return result.rows[0]?.state ?? null;
  }

  async saveResumeState(state: ResumeState): Promise<void> {
    await this.db.query(
      `insert into education_resume(learner_id, state, updated_at)
       values($1, $2::jsonb, now())
       on conflict (learner_id) do update
       set state = excluded.state, updated_at = now()`,
      [state.learnerId, JSON.stringify(state)],
    );
  }

  async getProgress(learnerId: LearnerId): Promise<LearnerProgress> {
    const result = await this.db.query<JsonStateRow<LearnerProgress>>(
      'select state from education_progress where learner_id = $1',
      [learnerId],
    );
    return result.rows[0]?.state ?? createEmptyProgress(learnerId);
  }

  async saveProgress(learnerId: LearnerId, progress: LearnerProgress): Promise<void> {
    await this.db.query(
      `insert into education_progress(learner_id, state, updated_at)
       values($1, $2::jsonb, now())
       on conflict (learner_id) do update
       set state = excluded.state, updated_at = now()`,
      [learnerId, JSON.stringify(progress)],
    );
  }
}
