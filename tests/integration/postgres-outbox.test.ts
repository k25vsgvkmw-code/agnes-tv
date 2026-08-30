import { afterAll, beforeEach, expect, it } from 'vitest';
import { createPostgresPool, withTransaction } from '../../src/persistence/postgres.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import type { AgnesEvent } from '../../src/events/agnes-event.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests');

const pool = createPostgresPool(databaseUrl);
const repository = new PostgresOutboxRepository(pool);

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'test.event.v1',
  version: 1,
  occurredAt: new Date('2026-08-30T10:00:00Z'),
  receivedAt: new Date('2026-08-30T10:00:00Z'),
  source: 'integration-test',
  householdId: '22222222-2222-4222-8222-222222222222',
  payload: { ok: true },
  metadata: {},
} as unknown as AgnesEvent<{ ok: boolean }>;

beforeEach(async () => {
  await pool.query('DELETE FROM outbox_events');
});

afterAll(async () => {
  await pool.end();
});

it('persists a durable unpublished event exactly once', async () => {
  await repository.append(event);
  await repository.append(event);

  const stored = await repository.get(event.id);
  expect(stored?.event.type).toBe('test.event.v1');
  expect(stored?.publishedAt).toBeNull();

  const count = await pool.query<{ count: string }>('SELECT count(*) FROM outbox_events');
  expect(count.rows[0]?.count).toBe('1');
});

it('rolls back an outbox append when the surrounding transaction fails', async () => {
  await expect(
    withTransaction(pool, async (client) => {
      await repository.append(event, client);
      throw new Error('rollback');
    }),
  ).rejects.toThrow('rollback');

  expect(await repository.get(event.id)).toBeNull();
});
