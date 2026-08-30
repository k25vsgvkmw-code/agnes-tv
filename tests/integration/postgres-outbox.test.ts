import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { pool, withTransaction } from '../../src/persistence/postgres.js';

const outbox = new PostgresOutboxRepository(pool);

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

describe('PostgreSQL transactional outbox', () => {
  it('commits domain state and outbox event atomically', async () => {
    const householdId = newHouseholdId();
    const event = createAgnesEvent({
      type: 'calendar.event.created.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:30:00Z'),
      receivedAt: new Date('2026-09-01T15:30:01Z'),
      source: 'test-calendar',
      householdId,
      payload: { externalId: 'evt-1' },
      metadata: {},
    });

    await withTransaction(async (tx) => {
      await tx.query(
        'INSERT INTO households(id, name, timezone, locale, status) VALUES($1, $2, $3, $4, $5)',
        [householdId, 'Home', 'Asia/Nicosia', 'el-CY', 'active'],
      );
      await outbox.append(tx, event);
    });

    const householdRows = await pool.query('SELECT id FROM households WHERE id = $1', [
      householdId,
    ]);
    const outboxRows = await pool.query(
      'SELECT event_type, attempts, published_at FROM outbox_events WHERE event_id = $1',
      [event.id],
    );

    expect(householdRows.rows).toHaveLength(1);
    expect(outboxRows.rows).toHaveLength(1);
    expect(outboxRows.rows[0]).toMatchObject({
      event_type: 'calendar.event.created.v1',
      attempts: 0,
      published_at: null,
    });
  });

  it('rolls back both domain state and outbox event when the transaction fails', async () => {
    const householdId = newHouseholdId();
    const event = createAgnesEvent({
      type: 'calendar.event.created.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:30:00Z'),
      receivedAt: new Date('2026-09-01T15:30:01Z'),
      source: 'test-calendar',
      householdId,
      payload: {},
      metadata: {},
    });

    await expect(
      withTransaction(async (tx) => {
        await tx.query(
          'INSERT INTO households(id, name, timezone, locale, status) VALUES($1, $2, $3, $4, $5)',
          [householdId, 'Home', 'Asia/Nicosia', 'el-CY', 'active'],
        );
        await outbox.append(tx, event);
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(
      (await pool.query('SELECT id FROM households WHERE id = $1', [householdId])).rows,
    ).toHaveLength(0);
    expect(
      (await pool.query('SELECT event_id FROM outbox_events WHERE event_id = $1', [event.id])).rows,
    ).toHaveLength(0);
  });

  it('enforces one external reference per provider and external id', async () => {
    const firstId = randomUUID();
    await pool.query(
      'INSERT INTO external_references(id, provider, external_id, last_synced_at, authoritative) VALUES($1, $2, $3, NOW(), TRUE)',
      [firstId, 'test-calendar', 'evt-1'],
    );

    await expect(
      pool.query(
        'INSERT INTO external_references(id, provider, external_id, last_synced_at, authoritative) VALUES($1, $2, $3, NOW(), TRUE)',
        [randomUUID(), 'test-calendar', 'evt-1'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
