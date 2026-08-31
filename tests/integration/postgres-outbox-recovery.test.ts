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

it('leases claimed events and recovers processing records after the lease expires', async () => {
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

  const firstClaim = await outbox.claimBatch(1);
  expect(firstClaim.map((record) => record.event.id)).toContain(event.id);

  const leased = await pool.query<{ publication_state: string; available_at: Date }>(
    'select publication_state, available_at from outbox_events where event_id = $1',
    [event.id],
  );
  expect(leased.rows[0]?.publication_state).toBe('processing');
  expect(leased.rows[0]?.available_at.getTime()).toBeGreaterThan(Date.now());
  expect(await outbox.claimBatch(10)).toHaveLength(0);

  await pool.query('update outbox_events set available_at = now() - interval $2 where event_id = $1', [
    event.id,
    '1 second',
  ]);

  const recovered = await outbox.claimBatch(10);
  const recoveredEvent = recovered.find((record) => record.event.id === event.id);
  expect(recoveredEvent).toBeDefined();
  expect(recoveredEvent?.attempts).toBe(2);
});
