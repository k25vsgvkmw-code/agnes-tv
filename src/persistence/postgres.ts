import { Pool, type PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (connectionString === undefined || connectionString.trim().length === 0) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({ connectionString });

export type PostgresTransaction = PoolClient;

export async function withTransaction<T>(
  work: (transaction: PostgresTransaction) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original transaction error. A broken connection will be released below.
    }
    throw error;
  } finally {
    client.release();
  }
}
