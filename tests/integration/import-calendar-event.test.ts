import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { importCalendarRecord } from '../../src/calendar/import-calendar-event.js';
import type { OutboxRepository } from '../../src/events/outbox.js';
import type { ExternalCalendarRecord } from '../../src/integrations/calendar/external-calendar-record.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type { HouseholdId } from '../../src/kernel/ids.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { createPostgresPool, withTransaction } from '../../src/persistence/postgres.js';

const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for calendar import tests');

const databaseName = `agnes_calendar_${process.pid}_${Date.now()}`;
const adminDatabaseUrl = new URL(sourceDatabaseUrl);
adminDatabaseUrl.pathname = '/postgres';
const isolatedDatabaseUrl = new URL(sourceDatabaseUrl);
isolatedDatabaseUrl.pathname = `/${databaseName}`;

const householdId = '82000000-0000-4000-8000-000000000001' as HouseholdId;
const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));
const adminPool = createPostgresPool(adminDatabaseUrl.toString());

let pool: ReturnType<typeof createPostgresPool> | undefined;
let calendarRepository: PostgresCalendarRepository | undefined;
let outboxRepository: PostgresOutboxRepository | undefined;

const baseRecord: ExternalCalendarRecord = {
  provider: 'test-calendar',
  externalId: 'fixture-1',
  title: 'Football',
  startsAt: '2026-09-01T18:30:00+03:00',
  endsAt: '2026-09-01T19:30:00+03:00',
  timezone: 'Asia/Nicosia',
  version: '1',
};

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = createPostgresPool(isolatedDatabaseUrl.toString());

  const coreMigration = await readFile(
    new URL('../../src/persistence/migrations/001_core.sql', import.meta.url),
    'utf8',
  );
  await pool.query(coreMigration);
  await pool.query(
    `INSERT INTO households (id, name, timezone, locale, status)
     VALUES ($1, 'Calendar Import Home', 'Asia/Nicosia', 'el-CY', 'active')`,
    [householdId],
  );

  calendarRepository = new PostgresCalendarRepository(pool);
  outboxRepository = new PostgresOutboxRepository(pool);
});

afterAll(async () => {
  if (pool !== undefined) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await adminPool.end();
});

function dependencies(outbox: Pick<OutboxRepository, 'append'>) {
  const activePool = pool;
  const activeCalendarRepository = calendarRepository;
  if (activePool === undefined || activeCalendarRepository === undefined) {
    throw new Error('calendar import test dependencies were not initialized');
  }

  return {
    householdId,
    clock,
    calendarRepository: activeCalendarRepository,
    outboxRepository: outbox,
    runInTransaction: <T>(operation: Parameters<typeof withTransaction<T>>[1]) =>
      withTransaction(activePool, operation),
  };
}

async function countOutboxEvents(type: string): Promise<number> {
  if (pool === undefined) throw new Error('calendar import test database was not initialized');
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM outbox_events WHERE event_type = $1',
    [type],
  );
  return Number(result.rows[0]?.count ?? 0);
}

describe('importCalendarRecord', () => {
  it('emits create/update events once and ignores an unchanged provider retry', async () => {
    if (outboxRepository === undefined) throw new Error('outbox repository was not initialized');
    const deps = dependencies(outboxRepository);

    const created = await importCalendarRecord(baseRecord, deps);
    const unchanged = await importCalendarRecord(baseRecord, deps);
    const updated = await importCalendarRecord(
      { ...baseRecord, title: 'Football - updated', version: '2' },
      deps,
    );

    expect(created.change).toBe('created');
    expect(unchanged.change).toBe('unchanged');
    expect(updated.change).toBe('updated');
    expect(updated.event.id).toBe(created.event.id);
    expect(await countOutboxEvents('calendar.event.created.v1')).toBe(1);
    expect(await countOutboxEvents('calendar.event.updated.v1')).toBe(1);
  });

  it('rolls back calendar state when outbox append fails', async () => {
    if (pool === undefined) throw new Error('calendar import test database was not initialized');

    const failingOutbox: Pick<OutboxRepository, 'append'> = {
      async append() {
        throw new Error('outbox unavailable');
      },
    };
    const record = { ...baseRecord, externalId: 'fixture-rollback', version: '1' };

    await expect(importCalendarRecord(record, dependencies(failingOutbox))).rejects.toThrow(
      'outbox unavailable',
    );

    const persisted = await pool.query<{ count: string }>(
      `SELECT count(*)
       FROM calendar_events c
       JOIN external_references e ON e.id = c.external_reference_id
       WHERE e.provider = $1 AND e.external_id = $2`,
      [record.provider, record.externalId],
    );
    expect(Number(persisted.rows[0]?.count ?? 0)).toBe(0);
  });
});
