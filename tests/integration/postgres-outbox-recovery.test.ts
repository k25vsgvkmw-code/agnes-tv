import { afterAll, expect, it } from 'vitest';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { pool, withTransaction } from '../../src/persistence/postgres.js';

const outbox = new PostgresOutboxRepository(pool);

afterAll(async () => {
  await pool.end();
});

it('recovers an expired processing record and gives it a fresh lease', async () => {
  const householdId = newHouseholdId();
  const event = createAgnesEvent(
    {
      type: 'household.created.v1',
      version: 1,
      source: 'test',
      householdId,
      payload: { name: 'Lease Home' },
    },
    new FixedClock(new Date('2026-08-31T08:00:00Z')),
  );

  await withTransaction(async (tx) => {
    await tx.query(
      'insert into households(id,name,timezone,locale,status) values($1,$2,$3,$4,$5)',
      [householdId, 'Lease Home', 'Asia/Nicosia', 'el-CY', 'active'],
    );
    await outbox.append(tx, event);
  });

  await pool.query(
    `update outbox_events
     set publication_state = 'processing', attempts = 1, available_at = now() - $2::interval
     where event_id = $1`,
    [event.id, '1 second'],
  );

  const recovered = await outbox.claimBatch(1000);
  const recoveredEvent = recovered.find((record) => record.event.id === event.id);
  expect(recoveredEvent).toBeDefined();
  expect(recoveredEvent?.attempts).toBe(2);
  expect(recoveredEvent?.publicationState).toBe('processing');
  expect(recoveredEvent?.availableAt.getTime()).toBeGreaterThan(Date.now());

  const immediateSecondClaim = await outbox.claimBatch(1000);
  expect(immediateSecondClaim.some((record) => record.event.id === event.id)).toBe(false);
});
