import { ValidationError } from '../kernel/errors.js';
import type { DeviceId } from '../kernel/ids.js';
import type {
  LocationSource,
  MovementState,
  PrivacyScope,
  SemanticPlace,
} from './location-state.js';

export interface LocationSignalInput {
  readonly deviceId: DeviceId;
  readonly semanticPlace: SemanticPlace;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly observedAt: Date;
  readonly expiresAt: Date;
  readonly movementState: MovementState;
  readonly source: LocationSource;
  readonly privacyScope: PrivacyScope;
}

export type LocationSignal = Readonly<LocationSignalInput>;

export function createLocationSignal(input: LocationSignalInput): LocationSignal {
  const hasLatitude = input.latitude !== undefined;
  const hasLongitude = input.longitude !== undefined;

  if (hasLatitude && !hasLongitude) {
    throw new ValidationError('longitude is required when latitude is provided', {
      field: 'longitude',
    });
  }

  if (hasLongitude && !hasLatitude) {
    throw new ValidationError('latitude is required when longitude is provided', {
      field: 'latitude',
    });
  }

  if (
    input.latitude !== undefined &&
    (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90)
  ) {
    throw new ValidationError('latitude must be between -90 and 90', {
      field: 'latitude',
      value: input.latitude,
    });
  }

  if (
    input.longitude !== undefined &&
    (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)
  ) {
    throw new ValidationError('longitude must be between -180 and 180', {
      field: 'longitude',
      value: input.longitude,
    });
  }

  if (input.expiresAt.getTime() <= input.observedAt.getTime()) {
    throw new ValidationError('expiresAt must be after observedAt', {
      field: 'expiresAt',
      observedAt: input.observedAt.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
    });
  }

  const coordinates =
    input.latitude === undefined
      ? {}
      : { latitude: input.latitude, longitude: input.longitude as number };

  return Object.freeze({
    deviceId: input.deviceId,
    semanticPlace: input.semanticPlace,
    ...coordinates,
    observedAt: new Date(input.observedAt.getTime()),
    expiresAt: new Date(input.expiresAt.getTime()),
    movementState: input.movementState,
    source: input.source,
    privacyScope: input.privacyScope,
  });
}
