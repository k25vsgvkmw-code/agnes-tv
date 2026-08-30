export type SemanticPlace =
  | 'HOME'
  | 'WORK'
  | 'SCHOOL'
  | 'ACTIVITY'
  | 'TRAVELLING'
  | 'OTHER_SAVED_PLACE'
  | 'UNKNOWN';

export type PrivacyScope = 'PRIVATE' | 'HOUSEHOLD' | 'PARENTS_ONLY' | 'SYSTEM_ONLY';

export type MovementState = 'STATIONARY' | 'MOVING' | 'UNKNOWN';

export type LocationSource = 'DEVICE_GEOFENCE' | 'DEVICE_LOCATION' | 'MANUAL';
