import type { PoolClient } from 'pg';
import type { AuditRecord, AuditRepository } from '../audit/audit-record.js';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { OutboxRepository } from '../events/outbox.js';
import type { Clock } from '../kernel/clock.js';
import { AgnesError } from '../kernel/errors.js';
import { newAuditRecordId, newEventId } from '../kernel/ids.js';
import type { HealthBridgeRegistration } from './health-bridge.js';
import type { HealthConfig } from './health-config.js';
import type { HealthMeasurement, RawHealthMeasurement } from './health-measurement.js';
import { normalizeHealthMeasurement } from './health-normalizer.js';
import type {
  HealthBridgeRepository,
  HealthMeasurementInsertChange,
  HealthMeasurementRepository,
} from './health-repositories.js';

export interface HealthMeasurementImportDependencies {
  readonly measurementRepository: HealthMeasurementRepository;
  readonly bridgeRepository: HealthBridgeRepository;
  readonly outboxRepository: OutboxRepository;
  readonly auditRepository: AuditRepository;
  readonly clock: Clock;
  readonly config: HealthConfig;
  readonly correlationId: string;
  readonly runInTransaction: <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
}

export interface HealthMeasurementImportResult {
  readonly measurement: HealthMeasurement;
  readonly change: HealthMeasurementInsertChange;
}

function failureAudit(
  raw: RawHealthMeasurement,
  bridge: HealthBridgeRegistration,
  correlationId: string,
  errorCode: string,
  occurredAt: Date,
): AuditRecord {
  return {
    id: newAuditRecordId(),
    householdId: bridge.householdId,
    action: 'health.measurement.import',
    outcome: 'failure',
    actorId: bridge.id,
    entityType: 'health_bridge',
    entityId: bridge.id,
    correlationId,
    errorCode,
    metadata: {
      bridgeId: bridge.id,
      kind: raw.kind,
    },
    occurredAt,
  };
}

function successAudit(
  measurement: HealthMeasurement,
  bridge: HealthBridgeRegistration,
  correlationId: string,
): AuditRecord {
  return {
    id: newAuditRecordId(),
    householdId: bridge.householdId,
    action: 'health.measurement.import',
    outcome: 'success',
    actorId: bridge.id,
    entityType: 'health_measurement',
    entityId: measurement.id,
    correlationId,
    metadata: {
      bridgeId: bridge.id,
      kind: measurement.kind,
      provider: bridge.provider,
    },
    occurredAt: measurement.receivedAt,
  };
}

function importedEvent(
  measurement: HealthMeasurement,
  bridge: HealthBridgeRegistration,
  correlationId: string,
): AgnesEvent {
  return {
    id: newEventId(),
    type: 'health.measurement.imported.v1',
    version: 1,
    occurredAt: measurement.measuredAt,
    receivedAt: measurement.receivedAt,
    source: 'health_bridge',
    householdId: bridge.householdId,
    actorId: bridge.id,
    entityType: 'health_measurement',
    entityId: measurement.id,
    correlationId,
    payload: {
      measurementId: measurement.id,
      bridgeId: bridge.id,
      personId: measurement.personId,
      kind: measurement.kind,
      measuredAt: measurement.measuredAt.toISOString(),
      receivedAt: measurement.receivedAt.toISOString(),
    },
    metadata: {
      provider: bridge.provider,
    },
  };
}

async function auditRejection(
  raw: RawHealthMeasurement,
  bridge: HealthBridgeRegistration,
  dependencies: HealthMeasurementImportDependencies,
  errorCode: string,
): Promise<void> {
  await dependencies.auditRepository.append(
    failureAudit(raw, bridge, dependencies.correlationId, errorCode, dependencies.clock.now()),
  );
}

export async function importHealthMeasurement(
  raw: RawHealthMeasurement,
  bridge: HealthBridgeRegistration,
  dependencies: HealthMeasurementImportDependencies,
): Promise<HealthMeasurementImportResult> {
  if (!bridge.allowedKinds.includes(raw.kind)) {
    const error = new AgnesError(
      'HEALTH_KIND_NOT_ALLOWED',
      'measurement kind is not allowed for this bridge',
    );
    await auditRejection(raw, bridge, dependencies, error.code);
    throw error;
  }

  let normalized: HealthMeasurement;
  try {
    normalized = normalizeHealthMeasurement(raw, {
      householdId: bridge.householdId,
      personId: bridge.personId,
      provider: bridge.provider,
      sourceDeviceId: bridge.sourceDeviceId,
      clock: dependencies.clock,
      config: dependencies.config,
    });
  } catch (error) {
    if (error instanceof AgnesError) {
      await auditRejection(raw, bridge, dependencies, error.code);
    }
    throw error;
  }

  return dependencies.runInTransaction(async (client) => {
    const result = await dependencies.measurementRepository.insertIfAbsent(normalized, client);
    if (result.change === 'unchanged') {
      return result;
    }

    await dependencies.bridgeRepository.recordMeasurementSeen(
      bridge.id,
      result.measurement.measuredAt,
      client,
    );
    await dependencies.outboxRepository.append(
      importedEvent(result.measurement, bridge, dependencies.correlationId),
      client,
    );
    await dependencies.auditRepository.append(
      successAudit(result.measurement, bridge, dependencies.correlationId),
      client,
    );

    return result;
  });
}
