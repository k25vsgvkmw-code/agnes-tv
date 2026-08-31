import { afterAll, expect, it } from 'vitest';
import { createCalendarEvent } from '../../src/calendar/calendar-event.js';
import { createHousehold } from '../../src/household/household.js';
import { normalizeCalendarRecord } from '../../src/integrations/calendar/calendar-normalizer.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { pool } from '../../src/persistence/postgres.js';

const householdRepository = new PostgresHouseholdRepository(pool);
const repository = new PostgresCalendarRepository(pool);
const syncClock = new FixedClock(new Date('2026-08-31T08:00:00Z'));

afterAll(async () => {
  await pool.end();
});

it('updates an imported calendar event instead of duplicating it', async () => {
  const household = createHousehold({
    name: 'AGNES Home',
    timezone: 'Asia/Nicosia',
    locale: 'el-CY',
  });
  await householdRepository.saveHousehold(household);

  const externalId = `evt-${household.id}`;
  const firstVersion = createCalendarEvent({
    householdId: household.id,
    ...normalizeCalendarRecord(
      {
        provider: 'test-calendar',
        externalId,
        title: 'Football',
        startsAt: '2026-09-01T18:30:00+03:00',
        endsAt: '2026-09-01T19:30:00+03:00',
        timezone: 'Asia/Nicosia',
        version: '1',
      },
      syncClock,
    ),
  });
  const secondVersion = createCalendarEvent({
    householdId: household.id,
    ...normalizeCalendarRecord(
      {
        provider: 'test-calendar',
        externalId,
        title: 'Football - updated',
        startsAt: '2026-09-01T18:30:00+03:00',
        endsAt: '2026-09-01T19:30:00+03:00',
        timezone: 'Asia/Nicosia',
        version: '2',
      },
      syncClock,
    ),
  });

  await repository.upsertByExternalReference(firstVersion);
  await repository.upsertByExternalReference(secondVersion);

  const events = await repository.listUpcoming(household.id, new Date('2026-09-01T00:00:00Z'));
  expect(events).toHaveLength(1);
  expect(events[0]?.title).toBe('Football - updated');
});
