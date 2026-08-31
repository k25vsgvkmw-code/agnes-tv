import { afterAll, expect, it } from 'vitest';
import { importCalendarRecord } from '../../src/calendar/import-calendar-event.js';
import { createHousehold } from '../../src/household/household.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { pool, withTransaction } from '../../src/persistence/postgres.js';

const households = new PostgresHouseholdRepository(pool);
const calendar = new PostgresCalendarRepository(pool);
const outbox = new PostgresOutboxRepository(pool);

afterAll(async () => {
  await pool.end();
});

it('emits create/update events once and ignores an unchanged provider retry', async () => {
  const household = createHousehold({
    name: 'Import Home',
    timezone: 'Asia/Nicosia',
    locale: 'el-CY',
  });
  await households.saveHousehold(household);

  const clock = new FixedClock(new Date('2026-09-01T12:00:00Z'));
  const record = {
    provider: 'test-calendar',
    externalId: 'event-42',
    title: 'Football',
    startsAt: '2026-09-01T18:30:00+03:00',
    endsAt: '2026-09-01T19:30:00+03:00',
    timezone: 'Asia/Nicosia',
    version: '1',
  };
  const context = {
    householdId: household.id,
    calendarRepository: calendar,
    outboxRepository: outbox,
    clock,
    transaction: withTransaction,
  };

  const created = await importCalendarRecord(record, context);
  const retried = await importCalendarRecord(record, context);
  const updated = await importCalendarRecord(
    { ...record, title: 'Football training', version: '2' },
    context,
  );

  expect(created.change).toBe('created');
  expect(retried.change).toBe('unchanged');
  expect(updated.change).toBe('updated');
  expect(updated.event.id).toBe(created.event.id);

  const events = await pool.query<{ event_type: string }>(
    `select event_type from outbox_events
     where household_id = $1 and event_type like 'calendar.event.%'
     order by created_at`,
    [household.id],
  );

  expect(events.rows.map((row) => row.event_type)).toEqual([
    'calendar.event.created.v1',
    'calendar.event.updated.v1',
  ]);
});
