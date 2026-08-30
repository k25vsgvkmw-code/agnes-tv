import type { Pool } from 'pg';
import type {
  HealthKind,
  HealthMeasurement,
  HealthProvider,
  HealthUnit,
} from '../health/health-measurement.js';
import type {
  HealthMeasurementInsertChange,
  HealthMeasurementRepository,
} from '../health/health-repositories.js';
import { ValidationError } from '../kernel/errors.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

interface HealthMeasurementRow {
  id: string;
  household_id: string;
  person_id: string;
  kind: HealthKind;
  value: number;
  unit: HealthUnit;
  measured_at: Date;
  source_provider: HealthProvider;
  source_device_id: string;
  external_id: string | null;
  dedupe_key: string;
  received_at: Date;
  metadata: Record<string, unknown>;
}

function rowToMeasurement(row: HealthMeasurementRow): HealthMeasurement {
  return {
    id: row.id,
    householdId: row.household_id as HouseholdId,
    personId: row.person_id as PersonId,
    kind: row.kind,
    value: row.value,
    unit: row.unit,
    measuredAt: new Date(row.measured_at),
    sourceProvider: row.source_provider,
    sourceDeviceId: row.source_device_id,
    dedupeKey: row.dedupe_key,
    receivedAt: new Date(row.received_at),
    metadata: row.metadata,
    ...(row.external_id === null ? {} : { externalId: row.external_id }),
  };
}

const measurementSelect = `
  SELECT id, household_id, person_id, kind, value, unit, measured_at,
         source_provider, source_device_id, external_id, dedupe_key, received_at, metadata
  FROM health_measurements`;

export class PostgresHealthMeasurementRepository implements HealthMeasurementRepository {
  constructor(private readonly pool: Pool) {}

  async insertIfAbsent(
    measurement: HealthMeasurement,
  ): Promise<{ measurement: HealthMeasurement; change: HealthMeasurementInsertChange }> {
    const bridgeResult = await this.pool.query<{ id: string }>(
      `SELECT id
       FROM health_bridges
       WHERE household_id = $1
         AND person_id = $2
         AND provider = $3
         AND source_device_id = $4`,
      [
        measurement.householdId,
        measurement.personId,
        measurement.sourceProvider,
        measurement.sourceDeviceId,
      ],
    );
    const bridgeId = bridgeResult.rows[0]?.id;
    if (bridgeId === undefined) {
      throw new ValidationError('registered health bridge not found for measurement source');
    }

    const inserted = await this.pool.query<HealthMeasurementRow>(
      `INSERT INTO health_measurements (
         id, bridge_id, household_id, person_id, kind, value, unit, measured_at,
         source_provider, source_device_id, external_id, dedupe_key, received_at, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING id, household_id, person_id, kind, value, unit, measured_at,
                 source_provider, source_device_id, external_id, dedupe_key, received_at, metadata`,
      [
        measurement.id,
        bridgeId,
        measurement.householdId,
        measurement.personId,
        measurement.kind,
        measurement.value,
        measurement.unit,
        measurement.measuredAt,
        measurement.sourceProvider,
        measurement.sourceDeviceId,
        measurement.externalId ?? null,
        measurement.dedupeKey,
        measurement.receivedAt,
        JSON.stringify(measurement.metadata),
      ],
    );

    const insertedRow = inserted.rows[0];
    if (insertedRow !== undefined) {
      return { measurement: rowToMeasurement(insertedRow), change: 'created' };
    }

    const existing = await this.pool.query<HealthMeasurementRow>(
      `${measurementSelect} WHERE dedupe_key = $1`,
      [measurement.dedupeKey],
    );
    const existingRow = existing.rows[0];
    if (existingRow === undefined) {
      throw new Error('health measurement conflict did not resolve to an existing row');
    }

    return { measurement: rowToMeasurement(existingRow), change: 'unchanged' };
  }

  async getLatestMeasuredAt(bridgeId: string): Promise<Date | null> {
    const result = await this.pool.query<{ measured_at: Date | null }>(
      'SELECT max(measured_at) AS measured_at FROM health_measurements WHERE bridge_id = $1',
      [bridgeId],
    );
    const measuredAt = result.rows[0]?.measured_at ?? null;
    return measuredAt === null ? null : new Date(measuredAt);
  }
}
