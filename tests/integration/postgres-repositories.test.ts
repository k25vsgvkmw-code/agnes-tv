import { afterAll, beforeEach, expect, it } from 'vitest';
import { createCalendarEvent } from '../../src/calendar/calendar-event.js';
import { createHousehold } from '../../src/household/household.js';
import { createPostgresPool } from '../../src/persistence/postgres.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests');

const pool = createPostgresPool(databaseUrl);
const households = new PostgresHouseholdRepository(pool);
const calendar = new PostgresCalendarRepository(pool);

beforeEach(async () => {
  await pool.query('DELETE FROM calendar_events');
  await pool.query('DELETE FROM external_references');
  await pool.query('DELETE FROM people');
  await pool.query('DELETE FROM households');
});

afterAll(async () => {
  await pool.end();
});

it('updates an imported calendar event instead of duplicating it', async () => {
  const household = createHousehold({
    name: 'AGNES Home',
    timezone: 'Asia/Nicosia',
    locale: 'el-CY',
  });
  await households.saveHousehold(household);

  const reference = {
    provider: 'test-calendar',
    externalId: 'evt-1',
    externalVersion: '1',
    lastSyncedAt: new Date('2026-08-30T10:00:00Z'),
    authoritative: true,
  } as const;

  const firstVersion = createCalendarEvent({
    householdId: household.id,
    title: 'Football',
    startsAt: new Date('2026-09-01T15:30:00Z'),
    endsAt: new Date('2026-09-01T16:30:00Z'),
    timezone: 'Asia/Nicosia',
    externalReference: reference,
  });
  const secondVersion = createCalendarEvent({
    householdId: household.id,
    title: 'Football - updated',
    startsAt: new Date('2026-09-01T15:30:00Z'),
    endsAt: new Date('2026-09-01T16:45:00Z'),
    timezone: 'Asia/Nicosia',
    externalReference: {
      ...reference,
      externalVersion: '2',
      lastSyncedAt: new Date('2026-08-30T11:00:00Z'),
    },
  });

  expect((await calendar.upsertByExternalReference(firstVersion)).change).toBe('created');
  expect((await calendar.upsertByExternalReference(secondVersion)).change).toBe('updated');

  const events = await calendar.listUpcoming(household.id, new Date('2026-09-01T00:00:00Z'));
  expect(events).toHaveLength(1);
  expect(events[0]?.title).toBe('Football - updated');
});
