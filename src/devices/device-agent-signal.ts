import type { DeviceId } from '../kernel/ids.js';
import {
  createLocationSignal,
  type LocationSignal,
} from '../location/location-signal.js';
import type {
  LocationSource,
  MovementState,
  PrivacyScope,
  SemanticPlace,
} from '../location/location-state.js';
import { ValidationError } from '../kernel/errors.js';

type UnknownRecord = Record<string, unknown>;

const SEMANTIC_PLACES = new Set<SemanticPlace>([
  'HOME',
  'WORK',
  'SCHOOL',
  'ACTIVITY',
  'TRAVELLING',
  'OTHER_SAVED_PLACE',
  'UNKNOWN',
]);
const MOVEMENT_STATES = new Set<MovementState>(['STATIONARY', 'MOVING', 'UNKNOWN']);
const LOCATION_SOURCES = new Set<LocationSource>([
  'DEVICE_GEOFENCE',
  'DEVICE_LOCATION',
  'MANUAL',
]);
const PRIVACY_SCOPES = new Set<PrivacyScope>([
  'PRIVATE',
  'HOUSEHOLD',
  'PARENTS_ONLY',
  'SYSTEM_ONLY',
]);

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readDate(field: string, value: unknown): Date {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be an ISO date string`, { field });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date string`, { field });
  }
  return date;
}

function readUnion<T extends string>(
  field: string,
  value: unknown,
  allowed: ReadonlySet<T>,
): T {
  if (typeof value !== 'string' || !allowed.has(value as T)) {
    throw new ValidationError(`${field} is invalid`, { field, value });
  }
  return value as T;
}

function optionalNumber(field: string, value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a finite number`, { field, value });
  }
  return value;
}

export function readDeviceAgentLocationSignal(body: unknown, deviceId: DeviceId): LocationSignal {
  const raw = asRecord(body);
  if (raw === null) {
    throw new ValidationError('location signal body must be an object');
  }

  const latitude = optionalNumber('latitude', raw.latitude);
  const longitude = optionalNumber('longitude', raw.longitude);

  return createLocationSignal({
    deviceId,
    semanticPlace: readUnion('semanticPlace', raw.semanticPlace, SEMANTIC_PLACES),
    ...(latitude === undefined ? {} : { latitude }),
    ...(longitude === undefined ? {} : { longitude }),
    observedAt: readDate('observedAt', raw.observedAt),
    expiresAt: readDate('expiresAt', raw.expiresAt),
    movementState: readUnion('movementState', raw.movementState, MOVEMENT_STATES),
    source: readUnion('source', raw.source, LOCATION_SOURCES),
    privacyScope: readUnion('privacyScope', raw.privacyScope, PRIVACY_SCOPES),
  });
}
