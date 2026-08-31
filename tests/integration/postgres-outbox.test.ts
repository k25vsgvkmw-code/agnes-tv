import { afterAll, expect, it } from 'vitest';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { pool, withTransaction } from '../../src/persistence/postgres.js';

const outbox = new PostgresOutboxRepository(pool);

afterAll(async () => {
  await pool.end();
});

it('commits domain state and outbox record atomically', async () => {
  const householdId = newHouseholdId();
  const event = createAgnesEvent(
    {
      type: 'household.created.v1',
      version: 1,
      source: 'test',
      householdId,
      payload: { name: 'Home' },
    },
    new FixedClock(new Date('2026-08-31T08:00:00Z')),
  );

  await withTransaction(async (tx) => {
    await tx.query(
      'insert into households(id,name,timezone,locale,status) values($1,$2,$3,$4,$5)',
      [householdId, 'Home', 'Asia/Nicosia', 'el-CY', 'active'],
    );
    await outbox.append(tx, event);
  });

  const outboxRows = await pool.query<{ event_type: string }>(
    'select event_type from outbox_events where event_id = $1',
    [event.id],
  );

  expect(outboxRows.rows).toHaveLength(1);
  expect(outboxRows.rows[0]?.event_type).toBe('household.created.v1');
});
