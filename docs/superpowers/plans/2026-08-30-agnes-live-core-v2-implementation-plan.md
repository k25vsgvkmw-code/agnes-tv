# AGNES Live Core v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution. Implement every task with strict RED -> GREEN -> verification -> commit discipline.

**Goal:** Extend the verified AGNES Core v1 into a live household operating substrate with canonical weather, location/presence, routing, device identity/trust, signed device-agent ingestion, named capability policy, routed push/voice delivery, situation deduplication/bundling, offline commands, and one complete deterministic Live v2 end-to-end slice.

**Architecture:** Keep the existing modular TypeScript Core and event-driven boundaries. Live facts enter through provider-neutral ports, normalize into canonical types, materialize in `HouseholdContext`, become structured situations/candidates, pass deterministic decision/attention/permission policy, route to a suitable device/channel, and only become delivered after a provider receipt. Device agents are edge clients, never independent Cores. Production adapters remain behind ports; automated tests use deterministic fakes and must not require external network access.

**Tech Stack:** Existing Node.js 24 / TypeScript 6 / Fastify 5 / PostgreSQL 18 / `pg` / Zod / Vitest / ESLint / Prettier. Add `firebase-admin` for FCM push and `openai` for speech adapters. Weather uses Open-Meteo REST through built-in `fetch`; routing uses Google Routes REST through built-in `fetch`; cryptographic device signatures use Node `crypto` Ed25519.

**Spec:** `docs/superpowers/specs/2026-08-30-agnes-live-core-v2-design.md`

## Global Constraints

- Preserve all green Core v1 behavior and its calendar-to-notification E2E slice.
- No final UI/UX, 3D/avatar, Travel, Sports, Shopping, Health, broad Smart Home, or finance feature work in this plan.
- Domain/application modules never depend directly on provider SDKs.
- External live facts must carry source, observation time, expiry, confidence where applicable, and explicit freshness.
- Expired facts cannot drive live decisions; stale facts must be identifiable and penalized or suppressed.
- Device location is authoritative; AI may reason over it but never fabricate or overwrite it.
- No continuous precise GPS history by default and no permanent raw-audio storage.
- Every device has independent revocable identity. Store public verification material server-side, never device private keys.
- Voice identification never upgrades authentication strength.
- Protected actions require deterministic policy; AI never authorizes.
- Raw events and automations never directly interrupt users. They create situations/candidates that pass bundling, decision, attention, permission, and routing.
- Delivery state becomes `delivered` only after a provider receipt.
- Side-effecting retries require idempotency.
- Automated tests use fakes/mocks and never depend on external provider availability or credentials.
- Every task follows TDD: write failing test, run and confirm intended failure, implement minimum code, run focused tests, run full gates, commit.

## Planned Runtime Structure

```text
src/
  live/freshness.ts
  weather/
  location/
  routing/
  presence/
  devices/
  authentication/
  permissions/
  notifications/
  voice/
  situations/
  automations/
  persistence/migrations/002_live_core.sql
  transport/device-agent-routes.ts
  app/build-live-services.ts

tests/
  unit/
  integration/
  contract/
  e2e/
```

---

### Task 1: Live Fact Freshness and Live IDs

**Files:**
- Create: `src/live/freshness.ts`
- Modify: `src/kernel/ids.ts`
- Test: `tests/unit/live-freshness.test.ts`
- Modify: `tests/unit/kernel.test.ts`

**Produces:** `FreshnessState`, `evaluateFreshness()`, branded `DeviceId`, `SituationId`, `CommandId` and UUID factories.

- [ ] **Step 1: Write failing tests**

```ts
import { expect, it } from 'vitest';
import { evaluateFreshness } from '../../src/live/freshness.js';

const now = new Date('2026-09-01T15:00:00Z');

it('marks a recently observed live fact fresh', () => {
  expect(
    evaluateFreshness(
      new Date('2026-09-01T14:55:00Z'),
      new Date('2026-09-01T15:20:00Z'),
      now,
    ),
  ).toBe('FRESH');
});

it('marks a fact expired once expiresAt is not in the future', () => {
  expect(evaluateFreshness(new Date('2026-09-01T14:30:00Z'), now, now)).toBe('EXPIRED');
});

it('returns UNKNOWN when observation or expiry is missing', () => {
  expect(evaluateFreshness(null, null, now)).toBe('UNKNOWN');
});
```

Extend `tests/unit/kernel.test.ts` to assert `newDeviceId()`, `newSituationId()`, and `newCommandId()` match the existing UUID pattern.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/live-freshness.test.ts tests/unit/kernel.test.ts`

Expected: FAIL because live freshness and new IDs do not exist.

- [ ] **Step 3: Implement minimum contracts**

```ts
export type FreshnessState = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNKNOWN';

export function evaluateFreshness(
  observedAt: Date | null,
  expiresAt: Date | null,
  now: Date,
): FreshnessState {
  if (observedAt === null || expiresAt === null) return 'UNKNOWN';
  if (expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  const lifetime = expiresAt.getTime() - observedAt.getTime();
  if (lifetime <= 0) return 'EXPIRED';
  const age = Math.max(0, now.getTime() - observedAt.getTime());
  return age / lifetime > 0.75 ? 'STALE' : 'FRESH';
}
```

Add branded IDs and UUID factories in `src/kernel/ids.ts` following the existing pattern.

- [ ] **Step 4: Verify focused + full gates**

Run: `npm test -- tests/unit/live-freshness.test.ts tests/unit/kernel.test.ts && npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/live src/kernel/ids.ts tests/unit/live-freshness.test.ts tests/unit/kernel.test.ts
git commit -m "feat: add Live v2 freshness and identifiers"
```

---

### Task 2: Canonical Weather + Fake + Open-Meteo Adapter

**Files:**
- Create: `src/weather/weather-snapshot.ts`
- Create: `src/weather/weather-port.ts`
- Create: `src/weather/fake-weather-port.ts`
- Create: `src/weather/open-meteo-weather-adapter.ts`
- Test: `tests/unit/weather.test.ts`
- Test: `tests/contract/open-meteo-weather-adapter.test.ts`
- Modify: `.env.example`

**Produces:** provider-neutral `WeatherSnapshot`, `WeatherPort.getCurrent()`, deterministic fake, production Open-Meteo adapter.

- [ ] **Step 1: Write failing canonical tests**

```ts
import { expect, it } from 'vitest';
import { createWeatherSnapshot } from '../../src/weather/weather-snapshot.js';
import { newHouseholdId } from '../../src/kernel/ids.js';

it('creates a canonical weather snapshot with bounded probabilities', () => {
  const snapshot = createWeatherSnapshot({
    householdId: newHouseholdId(),
    placeId: 'home',
    observedAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt: new Date('2026-09-01T15:20:00Z'),
    temperatureC: 29,
    feelsLikeC: 31,
    condition: 'rain',
    rainProbability: 0.8,
    precipitationMm: 1.2,
    windSpeedKmh: 18,
    windGustKmh: 27,
    humidity: 70,
    visibilityKm: 10,
    uvIndex: 2,
    source: 'fake-weather',
    confidence: 0.95,
  });
  expect(snapshot.rainProbability).toBe(0.8);
});
```

Add invalid tests for probability/confidence outside `0..1`, invalid dates, and `expiresAt <= observedAt`.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/weather.test.ts`

Expected: FAIL because weather module does not exist.

- [ ] **Step 3: Implement canonical type and port**

```ts
export interface WeatherQuery {
  readonly householdId: HouseholdId;
  readonly placeId: string;
  readonly point: { readonly latitude: number; readonly longitude: number };
  readonly now: Date;
}

export interface WeatherPort {
  getCurrent(query: WeatherQuery): Promise<WeatherSnapshot>;
}
```

`FakeWeatherPort` returns a cloned deterministic snapshot.

- [ ] **Step 4: Add Open-Meteo adapter contract test and implementation**

Mock `globalThis.fetch` and assert the adapter calls `/v1/forecast` with `timezone=auto`, current variables for temperature/apparent temperature/humidity/precipitation/weather code/wind/gust, and hourly precipitation probability/visibility/UV. Normalize provider percentages into `0..1`; use provider time as `observedAt` where available and set `expiresAt` to 20 minutes after observation.

The adapter must throw `AgnesError('WEATHER_PROVIDER_ERROR', ...)` for non-2xx responses or malformed required fields. No live HTTP call in tests.

Add to `.env.example`:

```text
OPEN_METEO_BASE_URL=https://api.open-meteo.com
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/weather.test.ts tests/contract/open-meteo-weather-adapter.test.ts && npm run check`

```bash
git add src/weather tests/unit/weather.test.ts tests/contract/open-meteo-weather-adapter.test.ts .env.example
git commit -m "feat: add canonical weather and Open-Meteo adapter"
```

---

### Task 3: Canonical Location Signals

**Files:**
- Create: `src/location/location-state.ts`
- Create: `src/location/location-signal.ts`
- Create: `src/location/location-signal-port.ts`
- Create: `src/location/fake-location-signal-port.ts`
- Test: `tests/unit/location-signal.test.ts`

**Produces:** validated device-authoritative location signal contract.

- [ ] **Step 1: RED test**

```ts
it('requires latitude and longitude together', () => {
  expect(() => createLocationSignal({
    deviceId: newDeviceId(),
    semanticPlace: 'HOME',
    latitude: 34.9,
    observedAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt: new Date('2026-09-01T15:10:00Z'),
    movementState: 'STATIONARY',
    source: 'DEVICE_GEOFENCE',
    privacyScope: 'HOUSEHOLD',
  })).toThrow('longitude');
});
```

Also test latitude/longitude bounds and expiry ordering.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/location-signal.test.ts`

- [ ] **Step 3: Implement**

Use exact unions:

```ts
export type SemanticPlace =
  | 'HOME' | 'WORK' | 'SCHOOL' | 'ACTIVITY' | 'TRAVELLING'
  | 'OTHER_SAVED_PLACE' | 'UNKNOWN';
export type PrivacyScope = 'PRIVATE' | 'HOUSEHOLD' | 'PARENTS_ONLY' | 'SYSTEM_ONLY';
export type MovementState = 'STATIONARY' | 'MOVING' | 'UNKNOWN';
export type LocationSource = 'DEVICE_GEOFENCE' | 'DEVICE_LOCATION' | 'MANUAL';
```

`LocationSignalPort.ingest(signal)` is an application/device-ingress port; fake stores submitted signals for tests.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/unit/location-signal.test.ts && npm run check`

- [ ] **Step 5: Commit**

```bash
git add src/location tests/unit/location-signal.test.ts
git commit -m "feat: add canonical device location signals"
```

---

### Task 4: Canonical Routing + Fake + Google Routes Adapter

**Files:**
- Create: `src/routing/travel-condition.ts`
- Create: `src/routing/routing-port.ts`
- Create: `src/routing/fake-routing-port.ts`
- Create: `src/routing/google-routes-adapter.ts`
- Test: `tests/unit/routing.test.ts`
- Test: `tests/contract/google-routes-adapter.test.ts`
- Modify: `.env.example`

**Produces:** canonical demand-driven route estimate and production REST adapter.

- [ ] **Step 1: RED canonical tests**

Test validation for non-negative duration/distance/delay, confidence `0..1`, expiry after observation.

- [ ] **Step 2: Implement routing port**

```ts
export interface RouteRequest {
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly mode: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
  readonly departureAt: Date;
}
export interface RoutingPort {
  getRoute(request: RouteRequest): Promise<TravelCondition>;
}
```

- [ ] **Step 3: RED adapter contract test**

Mock fetch. For DRIVE assert POST to `https://routes.googleapis.com/directions/v2:computeRoutes`, `X-Goog-Api-Key`, field mask `routes.duration,routes.staticDuration,routes.distanceMeters`, and `routingPreference: 'TRAFFIC_AWARE'`. Assert `trafficDelayMinutes = max(0, duration-staticDuration)`.

- [ ] **Step 4: Implement adapter**

No API key -> `AgnesError('ROUTING_PROVIDER_UNAVAILABLE', ...)`. Provider/malformed response -> `ROUTING_PROVIDER_ERROR`. Set short route expiry (5 minutes) and confidence `0.9` when provider returns a valid route.

Add `GOOGLE_MAPS_API_KEY=` to `.env.example`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/routing.test.ts tests/contract/google-routes-adapter.test.ts && npm run check`

```bash
git add src/routing tests/unit/routing.test.ts tests/contract/google-routes-adapter.test.ts .env.example
git commit -m "feat: add canonical routing and Google Routes adapter"
```

---

### Task 5: Presence State and Multi-Signal Resolver

**Files:**
- Create: `src/presence/presence-state.ts`
- Create: `src/presence/presence-resolver.ts`
- Test: `tests/unit/presence-resolver.test.ts`

**Produces:** deterministic `PresenceState` resolution with uncertainty.

- [ ] **Step 1: RED tests**

Cover:
- fresh HOME location -> PRESENT;
- expired location -> UNKNOWN;
- calendar evidence alone -> UNKNOWN;
- conflicting PRESENT/AWAY signals with score gap <=0.15 -> UNKNOWN;
- fresh manual state wins.

- [ ] **Step 2: Implement evidence contract**

```ts
export type PresenceStateName = 'PRESENT' | 'AWAY' | 'ARRIVING' | 'LEAVING' | 'UNKNOWN';
export type PresenceEvidenceSource =
  | 'MANUAL' | 'LOCATION' | 'HOME_WIFI' | 'NEARBY' | 'INTERACTION' | 'CALENDAR';
```

Weights: MANUAL `1.0`, LOCATION `.9`, HOME_WIFI `.8`, NEARBY `.7`, INTERACTION `.4`, CALENDAR `.2`.

- [ ] **Step 3: Resolver rules**

Ignore expired evidence. Calendar cannot be sole proof. Normalize confidence to `0..1`; if opposing top scores differ by <=0.15 return UNKNOWN. Preserve contributing sources and expiry equal to the earliest expiry of evidence used.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/unit/presence-resolver.test.ts && npm run check`

- [ ] **Step 5: Commit**

```bash
git add src/presence tests/unit/presence-resolver.test.ts
git commit -m "feat: add deterministic household presence resolver"
```

---

### Task 6: HouseholdContext v2 and Live Event Projection

**Files:**
- Modify: `src/context/household-context.ts`
- Modify: `src/context/update-context-from-event.ts`
- Modify: `tests/unit/context-projector.test.ts`

**Produces:** weather, route, presence, device and active-situation projections with JSONB date hydration.

- [ ] **Step 1: RED projector tests**

Create `weather.snapshot.updated.v1`, `travel.conditions.updated.v1`, `person.presence.changed.v1`, and `device.heartbeat.v1` events; serialize payloads through `JSON.stringify/parse`; assert projected dates are `Date` and `presenceByPerson` is updated by person id.

- [ ] **Step 2: Extend context model**

Add:

```ts
readonly presenceByPerson: Readonly<Record<string, PresenceState>>;
readonly currentWeather?: WeatherSnapshot;
readonly travelConditions?: TravelCondition;
readonly deviceStates: readonly DeviceStateContext[];
readonly activeSituations: readonly LiveSituation[];
```

Keep `peoplePresent` / `peopleAway` as derived compatibility projections.

- [ ] **Step 3: Extend projector with type-specific readers**

Do not blindly cast event payload. Add dedicated runtime hydration functions for each supported live event and ignore malformed payloads safely.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/unit/context-projector.test.ts && npm run check`

- [ ] **Step 5: Commit**

```bash
git add src/context tests/unit/context-projector.test.ts
git commit -m "feat: materialize Live v2 household context"
```

---

### Task 7: Persistent Device Identity, Trust, Heartbeat, Push Tokens, and Revocation

**Files:**
- Create: `src/devices/device.ts`
- Create: `src/devices/device-repository.ts`
- Create: `src/devices/push-token-repository.ts`
- Create: `src/persistence/migrations/002_live_core.sql`
- Create: `src/persistence/postgres-device-repository.ts`
- Create: `src/persistence/postgres-push-token-repository.ts`
- Test: `tests/integration/postgres-live-device-repositories.test.ts`

**Produces:** durable per-device public identity/trust/reachability and revocable push tokens.

- [ ] **Step 1: RED integration test**

Apply `001_core.sql` then `002_live_core.sql`; seed household/person; save a device with a generated Ed25519 public key; round-trip it; record heartbeat; revoke; assert `revokedAt` is set and active push tokens are no longer returned.

- [ ] **Step 2: Create migration**

`devices` fields: uuid id PK, household FK, owner person nullable, device_type, platform, room nullable, capabilities jsonb, trust_level check, connection_state check, agent_version, public_key_pem, last_seen_at, registered_at, revoked_at.

`device_push_tokens`: uuid id, device FK, provider, token, created_at, revoked_at, unique(provider, token).

Create household/last_seen and active token indexes.

- [ ] **Step 3: Repository semantics**

`DeviceRepository` exposes `save`, `get`, `recordHeartbeat`, `revoke`, `listReachable`. A revoked device is never returned as reachable. Push-token repository exposes `register`, `listActiveForDevice`, `revokeForDevice`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/integration/postgres-live-device-repositories.test.ts && npm run check`

- [ ] **Step 5: Commit**

```bash
git add src/devices src/persistence/migrations/002_live_core.sql src/persistence/postgres-device-repository.ts src/persistence/postgres-push-token-repository.ts tests/integration/postgres-live-device-repositories.test.ts
git commit -m "feat: persist Live v2 device trust and push identity"
```

---

### Task 8: Signed Device-Agent Signal Ingestion

**Files:**
- Create: `src/devices/device-signature.ts`
- Create: `src/devices/device-agent-signal.ts`
- Create: `src/transport/device-agent-routes.ts`
- Test: `tests/unit/device-signature.test.ts`
- Test: `tests/unit/device-agent-routes.test.ts`

**Produces:** authenticated Ed25519 device ingress with replay-window protection.

- [ ] **Step 1: RED signature tests**

Generate an Ed25519 keypair in test. Canonical signed bytes:

```text
<deviceId>\n<timestampISO>\n<sha256(rawBody)>
```

Assert valid signature passes, altered body fails, timestamp older/newer than 5 minutes fails, revoked device fails.

- [ ] **Step 2: Implement verifier**

Use Node `crypto.verify(null, data, publicKeyPem, signature)`. Return structured errors `DEVICE_UNKNOWN`, `DEVICE_REVOKED`, `DEVICE_SIGNATURE_INVALID`, `DEVICE_TIMESTAMP_INVALID`.

- [ ] **Step 3: RED route test**

Register `POST /live/device/signals/location`. Required headers:
`x-agnes-device-id`, `x-agnes-timestamp`, `x-agnes-signature`.
The route verifies first, validates canonical location payload, then calls injected `ingestLocationSignal`. Invalid authentication must result in zero ingestion calls.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/unit/device-signature.test.ts tests/unit/device-agent-routes.test.ts && npm run check`

- [ ] **Step 5: Commit**

```bash
git add src/devices/device-signature.ts src/devices/device-agent-signal.ts src/transport/device-agent-routes.ts tests/unit/device-signature.test.ts tests/unit/device-agent-routes.test.ts
git commit -m "feat: authenticate signed device-agent signals"
```

---

### Task 9: Authentication Strength, Named Capabilities, and Step-Up Policy

**Files:**
- Create: `src/authentication/authentication-strength.ts`
- Create: `src/authentication/step-up-challenge.ts`
- Create: `src/permissions/named-capability.ts`
- Create: `src/permissions/live-policy-engine.ts`
- Test: `tests/unit/live-policy.test.ts`

**Produces:** deterministic Live v2 policy result `ALLOW | DENY | REQUIRE_CONFIRMATION | REQUIRE_STRONG_AUTH`.

- [ ] **Step 1: RED policy tests**

Cover:
- trusted phone + `live.presence.submit` + DEVICE_TRUSTED -> ALLOW;
- untrusted shared device + protected capability -> DENY;
- valid capability with insufficient auth -> REQUIRE_STRONG_AUTH;
- existing `requires_confirmation` grant -> REQUIRE_CONFIRMATION;
- private resource on shared household session -> DENY.

- [ ] **Step 2: Implement authentication order**

```ts
export const AUTHENTICATION_STRENGTH = [
  'ANONYMOUS', 'SESSION_KNOWN', 'DEVICE_TRUSTED', 'USER_AUTHENTICATED', 'STRONG_AUTHENTICATED',
] as const;
```

Use explicit rank comparison, not string ordering.

- [ ] **Step 3: Implement named capability policy**

Keep existing `evaluateCapability()` intact and compose it. Named capabilities include `live.presence.submit`, `family.location.view`, `calendar.read`, `calendar.create`, `family.message.send`, `shopping.list.modify`, `smart_home.light.control`, `door.unlock`, `purchase.confirm`, `finance.transfer`, `health.private.read`.

- [ ] **Step 4: Step-up challenge**

Challenge binds `actionId`, `actorId`, `deviceId`, `expiresAt`, `used`. `consume()` rejects expired, mismatch, or replay and flips `used=true` exactly once.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/live-policy.test.ts && npm run check`

```bash
git add src/authentication src/permissions/named-capability.ts src/permissions/live-policy-engine.ts tests/unit/live-policy.test.ts
git commit -m "feat: add Live v2 authentication and capability policy"
```

---

### Task 10: Notification Candidate and Deterministic Channel Router

**Files:**
- Create: `src/notifications/delivery-channel.ts`
- Create: `src/notifications/notification-candidate.ts`
- Create: `src/notifications/channel-router.ts`
- Create: `src/notifications/routed-notification-delivery.ts`
- Test: `tests/unit/channel-router.test.ts`

**Produces:** privacy-aware target/channel selection before delivery.

- [ ] **Step 1: RED routing tests**

Assert:
- away target + online trusted personal phone -> MOBILE_PUSH;
- present target + trusted home speaker and VOICE_HOME allowed -> VOICE_HOME;
- PRIVATE candidate never routes to shared TV/tablet;
- offline/revoked device never routes;
- if no target is routable, use SILENT_FEED only when explicitly allowed, otherwise return `NO_ROUTE`.

- [ ] **Step 2: Implement channel and candidate unions**

Channels exactly: `SILENT_FEED | IN_APP | MOBILE_PUSH | TABLET_ALERT | TV_BANNER | VOICE_HOME | VOICE_PERSONAL_DEVICE | CRITICAL_ALARM`.

- [ ] **Step 3: Implement router**

Router input includes candidate, target presence, attention, reachable devices. Sorting is deterministic: preferred channel order first, then personal/high-trust before shared/trusted, then stable device id.

- [ ] **Step 4: Routed delivery**

`RoutedNotificationDelivery` chooses route and delegates to a channel-specific `NotificationDelivery`; it returns the delegated receipt. Keep existing `createNotification()` verified state transition unchanged.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/channel-router.test.ts && npm run check`

```bash
git add src/notifications tests/unit/channel-router.test.ts
git commit -m "feat: route Live v2 notifications by context and privacy"
```

---

### Task 11: FCM Verified Push Adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/notifications/fcm-notification-delivery.ts`
- Test: `tests/contract/fcm-notification-delivery.test.ts`
- Modify: `.env.example`

**Produces:** real cross-platform push adapter behind existing delivery contract.

- [ ] **Step 1: Add dependency**

Run: `npm install firebase-admin`

- [ ] **Step 2: RED contract tests**

Inject a minimal sender interface rather than invoking Firebase directly in tests:

```ts
interface FcmSender { send(message: unknown): Promise<string> }
```

Assert successful message id becomes `{provider:'fcm', receiptId:id}` and provider rejection is propagated so `createNotification()` can mark the notification failed.

- [ ] **Step 3: Implement adapter**

Adapter accepts target token and notification; never reports receipt before `sender.send()` resolves. Provider initialization belongs in composition root, not domain module.

- [ ] **Step 4: Environment contract**

Add `FIREBASE_PROJECT_ID=`, `FIREBASE_CLIENT_EMAIL=`, `FIREBASE_PRIVATE_KEY=`. Empty credentials mean adapter is unavailable/degraded; startup health must still work.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/contract/fcm-notification-delivery.test.ts && npm run check`

```bash
git add package.json package-lock.json src/notifications/fcm-notification-delivery.ts tests/contract/fcm-notification-delivery.test.ts .env.example
git commit -m "feat: add verified Firebase push delivery"
```

---

### Task 12: Voice STT/TTS Ports, Sessions, Fakes, and OpenAI Speech Adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/voice/speech-to-text-port.ts`
- Create: `src/voice/text-to-speech-port.ts`
- Create: `src/voice/voice-session.ts`
- Create: `src/voice/fake-speech.ts`
- Create: `src/voice/openai-speech-adapter.ts`
- Test: `tests/unit/voice-session.test.ts`
- Test: `tests/contract/openai-speech-adapter.test.ts`
- Modify: `.env.example`

**Produces:** provider-neutral voice I/O with ephemeral raw audio and deterministic test doubles.

- [ ] **Step 1: Add dependency**

Run: `npm install openai`

- [ ] **Step 2: RED port/session tests**

Session states `OPEN | ACTIVE | CLOSED`; expired session cannot accept audio. `likelyPersonId/confidence` metadata never changes supplied authentication strength.

- [ ] **Step 3: Implement ports**

```ts
export interface SpeechToTextPort {
  transcribe(input: { audio: Uint8Array; mimeType: string; language?: string }): Promise<{ text: string }>;
}
export interface TextToSpeechPort {
  synthesize(input: { text: string; language: string }): Promise<{ audio: Uint8Array; mimeType: string }>;
}
```

No port method persists audio.

- [ ] **Step 4: OpenAI adapter with mocked client**

Default transcription model `gpt-4o-mini-transcribe`, TTS model `gpt-4o-mini-tts`, voice `marin`. Inject an SDK-shaped client into adapter tests; assert model/voice and returned bytes, no real API call.

Add `OPENAI_API_KEY=`, `OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`, `OPENAI_TTS_MODEL=gpt-4o-mini-tts`, `OPENAI_TTS_VOICE=marin`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/voice-session.test.ts tests/contract/openai-speech-adapter.test.ts && npm run check`

```bash
git add package.json package-lock.json src/voice tests/unit/voice-session.test.ts tests/contract/openai-speech-adapter.test.ts .env.example
git commit -m "feat: add Live v2 speech ports and OpenAI adapter"
```

---

### Task 13: Live Situation Lifecycle, Fingerprints, and Dedup Store

**Files:**
- Create: `src/situations/live-situation.ts`
- Create: `src/situations/situation-fingerprint.ts`
- Create: `src/situations/active-situation-store.ts`
- Create: `src/situations/in-memory-active-situation-store.ts`
- Modify: `src/situations/situation.ts`
- Test: `tests/unit/live-situation.test.ts`

**Produces:** explicit lifecycle and logical deduplication.

- [ ] **Step 1: RED tests**

Fingerprint must be stable regardless of related-entity ordering. Repeated same fingerprint updates one store entry. `expireBefore(now)` marks/removes expired active entries deterministically.

- [ ] **Step 2: Implement model**

States: `DETECTED | ACTIVE | UPDATED | RESOLVED | EXPIRED`. Add `DEPARTURE_PREPARATION` to `SituationType` while preserving `LATE_DEPARTURE_RISK`.

- [ ] **Step 3: Fingerprint**

Canonicalize household id, situation type, sorted `type:id` related entities, and normalized time-window key; SHA-256 the canonical string.

- [ ] **Step 4: Store**

Port: `getByFingerprint`, `upsert`, `resolve`, `expireBefore`. In-memory implementation for first Live slice.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/live-situation.test.ts && npm run check`

```bash
git add src/situations tests/unit/live-situation.test.ts
git commit -m "feat: add Live v2 situation lifecycle and deduplication"
```

---

### Task 14: Departure Bundling, Material Change, Cooldown, and Automation Candidate

**Files:**
- Create: `src/situations/departure-preparation-bundler.ts`
- Create: `src/situations/material-change.ts`
- Create: `src/situations/cooldown-policy.ts`
- Create: `src/automations/automation-candidate.ts`
- Create: `src/automations/evaluate-live-automation.ts`
- Test: `tests/unit/departure-preparation-bundler.test.ts`

**Produces:** one bundled situation/candidate instead of weather+traffic+calendar alert spam.

- [ ] **Step 1: RED tests**

Given event starts in 30 minutes, PRESENT presence, route 25 minutes, 10-minute buffer, and rain probability `.8`, assert exactly one `DEPARTURE_PREPARATION` situation with factors for route, required departure, traffic, and rain.

Expired weather must be omitted; expired route must prevent route-based departure calculation; UNKNOWN presence must not be treated as PRESENT.

- [ ] **Step 2: Implement bundler**

Return one LiveSituation and a concise deterministic Greek message template such as:

```ts
`Φύγετε περίπου ${minutesEarly} λεπτά νωρίτερα${rain ? '· αναμένεται βροχή.' : '.'}`
```

- [ ] **Step 3: Material-change and cooldown rules**

Default material change: required departure shifts by >=10 minutes, or urgency crosses the `.8` threshold. Default same-fingerprint cooldown: 10 minutes unless material change occurs.

- [ ] **Step 4: Automation boundary**

`evaluateLiveAutomation()` returns an `AutomationCandidate`; it never calls notification delivery. Candidate carries situation fingerprint, urgency, expiry, audience, allowed channels, and correlation id.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/departure-preparation-bundler.test.ts && npm run check`

```bash
git add src/situations src/automations tests/unit/departure-preparation-bundler.test.ts
git commit -m "feat: bundle Live v2 departure preparation signals"
```

---

### Task 15: Offline Command Queue and Reconnect Safety

**Files:**
- Create: `src/devices/offline-command.ts`
- Create: `src/devices/offline-command-repository.ts`
- Create: `src/persistence/postgres-offline-command-repository.ts`
- Modify: `src/persistence/migrations/002_live_core.sql`
- Test: `tests/integration/offline-command-repository.test.ts`
- Test: `tests/unit/offline-command-processing.test.ts`

**Produces:** bounded offline commands with expiry, idempotency, current-policy recheck, and revoked-device protection.

- [ ] **Step 1: RED repository tests**

Statuses: `PENDING | APPLIED | REJECTED | EXPIRED`. Enforce unique `(device_id,idempotency_key)` and preserve optional `baseVersion`.

- [ ] **Step 2: Extend migration/repository**

`offline_commands` stores uuid id, device/actor, capability, payload jsonb, idempotency_key, created_at, expires_at, base_version nullable, status, applied_at nullable, rejection_code nullable.

- [ ] **Step 3: RED processing tests**

Expired command -> EXPIRED and executor zero calls. Revoked device -> REJECTED and zero executor calls. Current live policy DENY -> REJECTED. Duplicate idempotency key executes once.

- [ ] **Step 4: Implement processor**

Order: load device -> reject revoked -> expiry check -> current live policy -> executor -> mark applied. Never grant more authority from cached/offline state.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/integration/offline-command-repository.test.ts tests/unit/offline-command-processing.test.ts && npm run check`

```bash
git add src/devices src/persistence/migrations/002_live_core.sql src/persistence/postgres-offline-command-repository.ts tests/integration/offline-command-repository.test.ts tests/unit/offline-command-processing.test.ts
git commit -m "feat: add safe Live v2 offline command queue"
```

---

### Task 16: Live v2 Composition Root and Server Wiring

**Files:**
- Create: `src/app/build-live-services.ts`
- Modify: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Modify: `tests/unit/build-app.test.ts`
- Modify: `tests/unit/server.test.ts`

**Produces:** one application composition with optional production adapters and explicit unavailable fallbacks.

- [ ] **Step 1: RED composition tests**

Assert `buildApp()` exposes `syncWeather`, `ingestLocationSignal`, `refreshRoute`, `evaluateDeparturePreparation`, and device repositories when Live dependencies are injected. Core v1 methods must remain available.

- [ ] **Step 2: Build Live service composition**

`build-live-services.ts` owns construction of presence resolver, live situation store, bundler, channel router, and live use cases. Keep `build-app.ts` under roughly 350 logical lines by delegating Live wiring.

- [ ] **Step 3: Event subscriptions**

Subscribe only relevant canonical events to the context projector. Location ingestion creates/publishes canonical presence event. Weather/route refreshes create canonical update events. Correlation/causation propagate through the flow.

- [ ] **Step 4: Server provider factories**

Open-Meteo adapter always has a default base URL. Google routing, FCM, and OpenAI speech are created only when required environment values exist; otherwise expose explicit unavailable/degraded adapters. `/health` must work with zero optional provider credentials.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/build-app.test.ts tests/unit/server.test.ts && npm run check`

```bash
git add src/app tests/unit/build-app.test.ts tests/unit/server.test.ts
git commit -m "feat: compose AGNES Live Core v2 services"
```

---

### Task 17: First Complete Live v2 End-to-End Slice

**Files:**
- Create: `tests/e2e/live-departure-preparation.test.ts`
- Modify Live wiring only as required by the test.

**Produces:** first proven Live v2 nervous-system slice.

- [ ] **Step 1: Write RED happy-path E2E**

Use PostgreSQL with migrations 001+002 and deterministic fakes. Sequence:

1. seed household and adult person;
2. generate Ed25519 phone keypair and persist TRUSTED/HIGH_TRUST phone public key;
3. import calendar event at `2026-09-01T18:30:00+03:00`;
4. run outbox worker so event enters context;
5. at fixed `2026-09-01T15:00:00Z`, send a signed HOME geofence signal;
6. verify presence becomes PRESENT;
7. fake weather returns fresh rain probability `.8`;
8. fake routing returns 25-minute route with traffic delay;
9. refresh weather/route into context;
10. evaluate departure preparation;
11. assert exactly one bundled situation/candidate;
12. router selects MOBILE_PUSH to the trusted phone;
13. fake push returns receipt and notification becomes delivered;
14. acknowledge it;
15. assert acknowledgement audit shares the original correlation id.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/e2e/live-departure-preparation.test.ts`

Expected: FAIL at the first missing application method/wiring, while existing Core tests remain green.

- [ ] **Step 3: Implement minimum missing wiring**

Do not add unrelated domains or UI. Keep fakes deterministic and use existing verified notification lifecycle.

- [ ] **Step 4: Add duplicate-input scenario**

Replay unchanged signed location, same weather, same route, same event within cooldown. Assert one active fingerprint and one delivered logical notification total.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/e2e/live-departure-preparation.test.ts && npm run check`

```bash
git add tests/e2e/live-departure-preparation.test.ts src
git commit -m "feat: prove AGNES Live v2 departure slice"
```

---

### Task 18: Security/Reliability Negatives, CI, Operations, and Acceptance

**Files:**
- Create: `tests/e2e/live-v2-negative-scenarios.test.ts`
- Modify: `.github/workflows/core-ci.yml`
- Modify: `.github/workflows/tdd.yml`
- Create: `docs/live-core-v2-operations.md`
- Modify: `README.md`

**Produces:** final Live v2 acceptance gates and operator contract.

- [ ] **Step 1: Add required negative E2E scenarios**

Prove at minimum:

1. stale/expired location -> no confident PRESENT;
2. expired weather -> not used as live weather fact;
3. duplicate weather/location -> no duplicate candidate/notification;
4. route change below material threshold -> no re-alert;
5. `UnavailableModelGateway` -> deterministic Live flow still succeeds;
6. untrusted/shared device requests protected capability -> DENY or REQUIRE_STRONG_AUTH;
7. denied protected action -> zero external executor calls;
8. delivery provider failure -> notification remains failed;
9. revoked device -> signed ingress rejected and pending protected command not executed;
10. expired offline command -> EXPIRED and zero side effect;
11. notification state events -> no detector recursion/loop;
12. PRIVATE candidate -> never routed to shared display.

- [ ] **Step 2: Update CI**

Rename acceptance workflow to `AGNES Core v2 CI` or equivalent and apply both migrations before gates:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_live_core.sql
npm run lint
npm run build
npm test
npm run format:check
```

TDD workflow must include `feature/agnes-live-core-v2` push trigger. CI must not require Open-Meteo, Google, Firebase, or OpenAI network calls/credentials.

- [ ] **Step 3: Write operations runbook**

`docs/live-core-v2-operations.md` documents runtime requirements, env vars, both migrations, provider degraded modes, device enrollment/revocation, signature headers, freshness semantics, offline queue behavior, push/voice configuration, and full local verification.

- [ ] **Step 4: README linkage and full verification**

README links Live v2 spec, plan, and runbook, and repeats that final visual UI is deferred.

Run:

```bash
npm ci
npm run lint
npm run build
npm test
npm run format:check
```

Expected: all Core v1 + Live v2 tests green.

- [ ] **Step 5: Commit and verify CI**

```bash
git add .github README.md docs tests/e2e/live-v2-negative-scenarios.test.ts
git commit -m "chore: add Live v2 acceptance and operations"
```

Push the implementation branch and require fresh successful CI evidence before claiming Live Core v2 complete.

## Completion Definition

AGNES Live Core v2 is complete only when:

- all 18 tasks are committed;
- Core v1 tests remain green;
- Live facts are canonical and freshness-aware;
- trusted/revoked device behavior is proven;
- signed device ingress rejects spoof/replay/stale requests;
- location/presence, weather and route facts materialize in context;
- one bundled departure situation produces one correctly routed verified notification;
- acknowledgement/audit correlation is preserved;
- duplicate/non-material updates do not spam;
- AI-unavailable mode remains functional;
- required negative security/privacy/offline scenarios pass;
- production adapters exist behind ports and are contract-tested without network;
- PostgreSQL migrations 001+002 apply cleanly in CI;
- lint, build, all tests, and formatting are green;
- final UI/UX/3D remains outside this phase.
