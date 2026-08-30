import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { normalizeCalendarRecord } from '../../src/integrations/calendar/calendar-normalizer.js';
import { pool } from '../../src/persistence/postgres.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';

const householdRepository = new PostgresHouseholdRepository(pool);
const calendarRepository = new PostgresCalendarRepository(pool);

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

describe('PostgreSQL canonical repositories', () => {
  it('round-trips household and people state', async () => {
    const household = createHousehold({
      name: 'AGNES Home',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });
    const person = createPerson({
      householdId: household.id,
      displayName: 'Parent',
      role: 'adult',
      locale: 'el-CY',
      timezone: 'Asia/Nicosia',
    });

    await householdRepository.saveHousehold(household);
    await householdRepository.savePerson(person);

    await expect(householdRepository.getHousehold(household.id)).resolves.toEqual(household);
    await expect(householdRepository.listPeople(household.id)).resolves.toEqual([person]);
  });

  it('updates an imported calendar event instead of duplicating it', async () => {
    const household = createHousehold({
      name: 'AGNES Home',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });
    await householdRepository.saveHousehold(household);

    const firstVersion = normalizeCalendarRecord(
      {
        provider: 'test-calendar',
        externalId: 'evt-1',
        title: 'Football',
        startsAt: '2026-09-01T18:30:00+03:00',
        endsAt: '2026-09-01T19:30:00+03:00',
        timezone: 'Asia/Nicosia',
        version: '1',
      },
      { householdId: household.id, lastSyncedAt: new Date('2026-08-30T08:00:00Z') },
    );

    const secondVersion = normalizeCalendarRecord(
      {
        provider: 'test-calendar',
        externalId: 'evt-1',
        title: 'Football - updated',
        startsAt: '2026-09-01T18:30:00+03:00',
        endsAt: '2026-09-01T20:00:00+03:00',
        timezone: 'Asia/Nicosia',
        version: '2',
      },
      { householdId: household.id, lastSyncedAt: new Date('2026-08-30T09:00:00Z') },
    );

    const firstResult = await calendarRepository.upsertByExternalReference(firstVersion);
    const secondResult = await calendarRepository.upsertByExternalReference(secondVersion);

    const events = await calendarRepository.listUpcoming(
      household.id,
      new Date('2026-09-01T00:00:00Z'),
    );

    expect(firstResult.change).toBe('created');
    expect(secondResult.change).toBe('updated');
    expect(secondResult.event.id).toBe(firstResult.event.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe('Football - updated');
    expect(events[0]?.externalReference.externalVersion).toBe('2');
  });
});
