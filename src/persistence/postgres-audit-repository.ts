import type { Pool, PoolClient } from 'pg';
import type { AuditRecord, AuditRepository } from '../audit/audit-record.js';

type Queryable = Pool | PoolClient;

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  async append(record: AuditRecord, client?: PoolClient): Promise<void> {
    const executor: Queryable = client ?? this.pool;
    await executor.query(
      `INSERT INTO audit_records (
         id, household_id, action, outcome, actor_id, entity_type, entity_id,
         correlation_id, error_code, metadata, occurred_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
      [
        record.id,
        record.householdId,
        record.action,
        record.outcome,
        record.actorId ?? null,
        record.entityType ?? null,
        record.entityId ?? null,
        record.correlationId ?? null,
        record.errorCode ?? null,
        JSON.stringify(record.metadata),
        record.occurredAt,
      ],
    );
  }
}
