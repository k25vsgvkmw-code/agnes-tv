export type { AuditRecord } from './audit-record.js';
import type { AuditRecord } from './audit-record.js';

export interface AuditRepository {
  append(record: AuditRecord): Promise<void>;
}
