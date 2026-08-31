import { Pool, type PoolClient } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function withTransaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
  const tx = await pool.connect();

  try {
    await tx.query('begin');
    const result = await work(tx);
    await tx.query('commit');
    return result;
  } catch (error) {
    await tx.query('rollback');
    throw error;
  } finally {
    tx.release();
  }
}
