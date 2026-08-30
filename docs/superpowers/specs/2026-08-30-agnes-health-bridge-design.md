# AGNES Health Bridge Design

Date: 2026-08-30
Status: Approved design awaiting implementation-plan review
Repository: `k25vsgvkmw-code/agnes-tv`

## 1. Goal

Add a production-grade Health Bridge to the greenfield AGNES backend so health status is based on real device-originated measurements instead of a placeholder flag.

The bridge is an ingestion and normalization subsystem only. It does not build the full Health OS UI, coaching, nutrition, medical interpretation, or automation layer.

## 2. Source Model

AGNES supports device-side health providers through a common bridge contract:

- Apple HealthKit on iOS
- Health Connect on Android

HealthKit and Health Connect remain authoritative for device health data. AGNES stores normalized imported measurements with provenance and sync metadata.

No server component claims direct access to HealthKit or Health Connect without a device bridge. Device applications push authorized measurements to AGNES through the ingestion API.

## 3. Canonical Measurement Contract

Initial supported measurement kinds:

- `steps`
- `heart_rate`
- `sleep`
- `weight`
- `active_energy`

Canonical fields:

- `id`
- `householdId`
- `personId`
- `kind`
- `value`
- `unit`
- `measuredAt`
- `sourceProvider`
- `sourceDeviceId`
- `externalId`
- `receivedAt`
- `metadata`

The canonical layer validates units and values before persistence. Provider-specific fields remain in metadata only when needed for provenance or sync.

## 4. Ingestion Flow

1. Device obtains user permission from HealthKit or Health Connect.
2. Device reads only permitted measurement types.
3. Device sends a signed/authenticated ingestion request to AGNES.
4. AGNES validates actor, household/person ownership, payload shape, timestamp, unit, and idempotency key.
5. Provider payload is normalized into the canonical `HealthMeasurement` type.
6. Measurement is deduplicated using provider + external id (or deterministic fingerprint when no external id is available).
7. AGNES persists the normalized record.
8. AGNES emits `health.measurement.imported.v1`.
9. Connector health state is recomputed from the most recent accepted measurement and device-bridge heartbeat.

## 5. Connector Status Semantics

The dashboard must not report `LIVE` merely because configuration exists.

### LIVE

Requirements:

- device bridge is authenticated/registered; and
- at least one valid health measurement has been accepted within the configured freshness window.

Default freshness window for v1: 24 hours.

### CONNECTED_NO_DATA

Use when:

- bridge is registered and recently reachable; but
- there is no valid measurement inside the freshness window.

Dashboard text: `CONNECTED · NO DATA TODAY`.

This is not a warning and not an error.

### DEGRADED

Use when:

- bridge was previously active but heartbeat/measurement freshness is stale beyond the grace window; or
- some requested health scopes are unavailable while the bridge remains operational.

### AUTH_EXPIRED

Use when the device bridge authentication/token is invalid or revoked.

### DISCONNECTED

Use when no bridge is registered for the person/device.

### ERROR

Use only for actual ingestion/system failures that cannot be represented by the states above.

## 6. Freshness and Heartbeats

The bridge tracks both:

- `lastHeartbeatAt`
- `lastMeasurementAt`

A heartbeat proves the device bridge can reach AGNES. It does not prove health data exists.

A valid recent measurement is required for `LIVE`.

V1 defaults:

- measurement freshness: 24 hours
- heartbeat freshness: 6 hours
- degraded grace: 48 hours

These values are configuration, not hard-coded domain constants.

## 7. Privacy and Permissions

Health data is sensitive and follows least-privilege rules:

- per-person authorization;
- per-measurement-type consent;
- no cross-person ingestion;
- source provenance retained;
- encrypted transport;
- audit entries for bridge registration, authorization changes, ingestion failures, and data deletion;
- the AI layer does not receive raw health data unless a permitted application use case explicitly requests it.

Health ingestion does not create medical diagnoses or clinical advice.

## 8. API Boundary

Initial application-facing ports:

- `HealthMeasurementRepository`
- `HealthBridgeRepository`
- `HealthNormalizer`
- `HealthStatusService`

Initial transport endpoints:

- `POST /integrations/health/heartbeat`
- `POST /integrations/health/measurements`
- `GET /integrations/health/status`

Transport validates authentication and request shape; domain/application code remains provider-agnostic.

## 9. Idempotency and Deduplication

Measurement ingestion is idempotent.

Primary deduplication key:

`sourceProvider + sourceDeviceId + externalId`

If a provider record does not expose a stable external id, AGNES computes a deterministic fingerprint from person, kind, timestamp, normalized value/unit, provider, and device id.

Repeated ingestion returns the already accepted canonical record and does not emit duplicate import events.

## 10. Error Handling

Reject with structured errors for:

- unsupported measurement kind;
- invalid unit for kind;
- impossible/invalid value;
- timestamp outside allowed clock-skew/import window;
- unknown person/device;
- actor not authorized for target person;
- malformed provider payload.

Transient persistence/event publication failures use normal AGNES retry/outbox behavior.

## 11. Dashboard Integration

The existing connection dashboard consumes the normalized connector-status contract rather than checking whether a secret/config field is populated.

Expected display behavior:

- `LIVE` — green
- `CONNECTED · NO DATA TODAY` — neutral/blue
- `DEGRADED` — amber
- `AUTH EXPIRED` — amber/red
- `DISCONNECTED` — neutral
- `ERROR` — red

The aggregate `x/7 live` counter counts only true `LIVE` connectors. It must not count `CONNECTED_NO_DATA` as live.

## 12. Testing Strategy

Implementation follows TDD.

Required unit/integration coverage:

- canonical normalization for each initial measurement kind;
- invalid units/values rejected;
- duplicate measurement ingestion is idempotent;
- recent heartbeat without measurements -> `CONNECTED_NO_DATA`;
- recent measurement + registered bridge -> `LIVE`;
- stale measurement -> `DEGRADED` or `CONNECTED_NO_DATA` according to heartbeat state;
- expired auth -> `AUTH_EXPIRED`;
- no bridge -> `DISCONNECTED`;
- aggregate live counter counts only true `LIVE` connectors;
- provider-specific payloads do not leak into domain logic.

## 13. Out of Scope

Not part of this implementation slice:

- health dashboards/charts;
- nutrition plans;
- workout coaching;
- medical interpretation;
- anomaly diagnosis;
- family-health sharing UX;
- Apple/Google OAuth UI beyond the bridge registration contract;
- smartwatch-specific direct server integrations.

## 14. Success Criteria

The Health Bridge slice is complete when:

1. a registered iOS/Android device bridge can send normalized health measurements;
2. repeated measurements are safely deduplicated;
3. connector status reflects actual freshness and authentication state;
4. dashboard status can distinguish live vs connected-with-no-data;
5. no fake data or configuration-only shortcut can produce `LIVE`;
6. tests cover status transitions, validation, and idempotency.
