import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { importCalendarRecord } from '../../src/calendar/import-calendar-event.js';
import type { OutboxRecord, OutboxRepository } from '../../src/events/outbox.js';
import { createHousehold } from '../../src/household/household.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { pool, withTransaction } from '../../src/persistence/postgres.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';

const record = {
  provider: 'test-calendar',
  externalId: 'evt-1',
  title: 'Football',
  startsAt: '2026-09-01T18:30:00+03:00',
  endsAt: '2026-09-01T19:30:00+03:00',
  timezone: 'Asia/Nicosia',
  version: '1',
} as const;

const clock = new FixedClock(new Date('2026-08-30T09:00:00Z'));
const householdRepository = new PostgresHouseholdRepository(pool);
const calendarRepository = new PostgresCalendarRepository(pool);
const outboxRepository = new PostgresOutboxRepository(pool);

beforeAll(async () => {
  const migration = await readFile(
    resolve(process.cwd(), 'src/persistence/migrations/001_core.sql'),
    'utf8',
  );
  await pool.query(migration);
});

beforeEach(async () => {
  await pool.query(
    'TRUNCATE outbox_events, calendar_events, external_references, people, households CASCADE',
  );
});

afterAll(async () => {
  await pool.end();
});

async function createTestHousehold() {
  const household = createHousehold({
    name: 'AGNES Home',
    timezone: 'Asia/Nicosia',
    locale: 'el-CY',
  });
  await householdRepository.saveHousehold(household);
  return household;
}

class FailingOutboxRepository implements OutboxRepository<PoolClient> {
  async append(): Promise<void> {
    throw new Error('outbox unavailable');
  }

  async claimBatch(): Promise<readonly OutboxRecord[]> {
    return [];
  }

  async markPublished(): Promise<void> {}
}

describe('calendar import', () => {
  it('does not emit a second logical event when the provider retries an unchanged record', async () => {
    const household = await createTestHousehold();
    const dependencies = {
      calendarRepository,
      outboxRepository,
      clock,
      runInTransaction: withTransaction,
    };

    await importCalendarRecord(record, { householdId: household.id }, dependencies);
    await importCalendarRecord(record, { householdId: household.id }, dependencies);

    const outboxRows = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM outbox_events ORDER BY created_at`,
    );

    expect(outboxRows.rows.map((row) => row.event_type)).toEqual(['calendar.event.created.v1']);
  });

  it('emits an updated event when canonical calendar state changes', async () => {
    const household = await createTestHousehold();
    const dependencies = {
      calendarRepository,
      outboxRepository,
      clock,
      runInTransaction: withTransaction,
    };

    await importCalendarRecord(record, { householdId: household.id }, dependencies);
    await importCalendarRecord(
      { ...record, title: 'Football - updated', version: '2' },
      { householdId: household.id },
      dependencies,
    );

    const outboxRows = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM outbox_events ORDER BY created_at`,
    );

    expect(outboxRows.rows.map((row) => row.event_type)).toEqual([
      'calendar.event.created.v1',
      'calendar.event.updated.v1',
    ]);
  });

  it('rolls back the canonical calendar write if outbox append fails', async () => {
    const household = await createTestHousehold();

    await expect(
      importCalendarRecord(
        record,
        { householdId: household.id },
        {
          calendarRepository,
          outboxRepository: new FailingOutboxRepository(),
          clock,
          runInTransaction: withTransaction,
        },
      ),
    ).rejects.toThrow('outbox unavailable');

    expect((await pool.query('SELECT id FROM calendar_events')).rows).toHaveLength(0);
    expect((await pool.query('SELECT id FROM external_references')).rows).toHaveLength(0);
  });
});
