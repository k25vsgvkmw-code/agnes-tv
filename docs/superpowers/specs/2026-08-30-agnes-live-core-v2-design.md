# AGNES Live Core v2 Design

Date: 2026-08-30
Status: Design specification for user review
Repository: `k25vsgvkmw-code/agnes-tv`
Base: verified AGNES Core v1

## 1. Purpose

AGNES Live Core v2 turns the verified Core v1 backend nervous system into a live household operating layer. It adds the minimum real-time capabilities required for AGNES to understand where household members are, what the weather and route conditions are, which devices are available, how to reach the right person, and how to keep operating safely when AI or connectivity is degraded.

The design preserves the Core v1 principles:

- canonical domain models instead of provider-shaped business logic;
- event-driven context materialization;
- transactional durability for critical state changes;
- deterministic permission, decision and safety policy;
- provider verification before reporting external success;
- AI as constrained intelligence, never source of truth or authorization authority;
- UI/UX and visual design remain deferred.

Live Core v2 is not a general feature expansion into travel, shopping, sports, health or smart-home product experiences. It is the live operational substrate those domains will use later.

## 2. Scope

Live Core v2 includes:

1. hybrid device + cloud deployment model;
2. canonical weather snapshots;
3. canonical location and presence state;
4. canonical routing/travel-condition state;
5. device agents and device health;
6. device trust and enrollment;
7. notification channel routing;
8. voice input/output ports and session model;
9. offline cache and outbound device command queue;
10. presence resolution from multiple signals;
11. authentication strength and capability policy integration;
12. step-up authentication for protected actions;
13. situation lifecycle, deduplication and bundling;
14. automation candidate generation without direct user interruption;
15. anti-spam, cooldown and material-change policy;
16. freshness/staleness semantics;
17. first complete Live v2 end-to-end household slice.

Explicitly outside this specification:

- final UI/UX, 3D character or visual language;
- Travel, Sports, Entertainment and Shopping domain experiences;
- Spotify, Health, Smart Home and Email/Contacts domain integrations;
- purchases, financial transfers or door-security execution adapters;
- permanent raw-audio storage;
- continuous fine-grained GPS history by default;
- full local replica of the cloud PostgreSQL database;
- a graph database;
- unconstrained autonomous AI actions.

## 3. Deployment Model

Live Core v2 uses a hybrid device + cloud topology.

```text
Phone Agents        Home/Tablet Agent        TV/Shared Devices
     \                    |                       /
      \                   |                      /
       +------------ AGNES Live Gateway --------+
                         |
                  Authentication / Sync
                         |
                      Event Bus
                         |
          +--------------+---------------+
          |              |               |
       Calendar        Weather        Location/Route
          \              |               /
           +------ HouseholdContext -----+
                         |
                 Situation Engine
                         |
          Automation / Bundling / Decision
                         |
                  Permission / Attention
                         |
                 Notification Router
                    /            \
                 Push            Voice
```

The cloud Core owns canonical shared state, household reasoning, durable events, policy and audit.

Device agents own device-native signals and capabilities such as:

- OS geofencing;
- push-token registration;
- microphone/speaker availability;
- local notifications and alarms;
- device authentication;
- secure credential storage;
- local operational cache;
- offline command queue.

A device agent is an edge runtime, not a second AGNES Core.

## 4. Canonical Weather Model

Provider payloads normalize into `WeatherSnapshot`.

Required fields:

- `household_id`;
- `place_id`;
- `observed_at`;
- `temperature_c`;
- `feels_like_c`;
- `condition`;
- `rain_probability`;
- `precipitation_mm`;
- `wind_speed_kmh`;
- `wind_gust_kmh`;
- `humidity`;
- `visibility_km`;
- `uv_index`;
- `source`;
- `confidence`;
- `expires_at`.

Weather providers are replaceable adapters behind `WeatherPort`. A fallback provider is permitted when provider semantics are equivalent enough for the required snapshot.

Weather facts are never invented or silently filled by an AI model.

Canonical events include:

- `weather.snapshot.updated.v1`;
- `weather.rain_expected.v1` when a detector converts forecast state into a structured situation input.

## 5. Canonical Location Model

Provider/device location signals normalize into `LocationState`.

Required fields:

- `person_id` optional when the device owner is not resolved;
- `device_id`;
- `place_id` optional;
- `latitude` optional;
- `longitude` optional;
- `accuracy_m` optional;
- `observed_at`;
- `movement_state`;
- `source`;
- `privacy_scope`;
- `expires_at`.

Location is device-authoritative. AI may reason over location state but may not fabricate, overwrite or authorize location facts.

AGNES does not retain continuous precise-coordinate history by default. The preferred operational representation is semantic place/presence state such as:

- HOME;
- WORK;
- SCHOOL;
- ACTIVITY;
- TRAVELLING;
- OTHER_SAVED_PLACE;
- UNKNOWN.

Precise coordinates are retained only where required for routing, explicit user features, troubleshooting or a separately approved policy.

Canonical location events include:

- `location.boundary.crossed.v1`;
- `person.location.changed.v1`;
- `person.presence.changed.v1`.

## 6. Canonical Route / Travel Conditions Model

Route providers normalize into `TravelCondition`.

Required fields:

- `origin`;
- `destination`;
- `mode`;
- `estimated_minutes`;
- `distance_km`;
- `traffic_delay_minutes`;
- `route_confidence`;
- `observed_at`;
- `expires_at`;
- `source`.

Core logic depends on `RoutingPort`, never directly on a maps provider SDK.

Route requests are demand-driven. AGNES should calculate a route when an upcoming event, departure window or explicit user request makes it relevant. It should not continuously poll routes without an active need.

Canonical route events include:

- `travel.conditions.updated.v1`;
- `travel.conditions.expired.v1` where expiry invalidates a previously materialized route estimate.

## 7. Data Freshness

Every live value that can become stale carries freshness metadata.

Freshness states:

- `FRESH`;
- `STALE`;
- `EXPIRED`;
- `UNKNOWN`.

Rules:

- `FRESH`: safe for normal operational decisions;
- `STALE`: may be shown with explicit stale status but must be penalized in decisions;
- `EXPIRED`: not valid for live operational decisions;
- `UNKNOWN`: no reliable current value exists.

AGNES must never present stale or expired state as current live fact.

## 8. Presence Model

Live Core v2 introduces a richer `PresenceState` rather than reducing household state to home/away booleans.

Fields:

- `person_id`;
- `household_id`;
- `state`;
- `confidence`;
- `place_id` optional;
- `observed_at`;
- `expires_at`;
- `sources[]`.

States:

- `PRESENT`;
- `AWAY`;
- `ARRIVING`;
- `LEAVING`;
- `UNKNOWN`.

Presence resolution combines independent signals where available:

- phone location/geofence;
- home Wi-Fi association;
- home-device proximity/presence;
- nearby Bluetooth where explicitly supported;
- recent device interaction;
- manually supplied status;
- calendar context only as supporting evidence, never sole proof.

The resolver evaluates source freshness and confidence. A stale phone location must not continue to imply presence after its expiry.

`UNKNOWN` is a first-class safe state. AGNES must prefer uncertainty over pretending to know.

## 9. Geofencing Strategy

Phone agents use OS-level geofencing for important saved places where available.

Flow:

```text
OS geofence
  -> Phone Agent
  -> location.boundary.crossed.v1
  -> Presence Resolver
  -> person.presence.changed.v1
  -> HouseholdContext projector
```

Geofencing is preferred over continuous GPS streaming because it reduces battery usage, privacy exposure and unnecessary network traffic.

Meaningful movement produces events. Small GPS jitter does not.

## 10. Device Model

The canonical `Device` model includes:

- `id`;
- `household_id`;
- `owner_person_id` optional;
- `device_type`;
- `platform`;
- `room` optional;
- `capabilities[]`;
- `trust_level`;
- `last_seen_at`;
- `connection_state`;
- `agent_version`;
- registration/revocation metadata.

Initial device types:

- PHONE;
- TABLET;
- TV;
- HOME_PANEL;
- SPEAKER;
- WATCH;
- COMPUTER;
- OTHER.

Connection states:

- ONLINE;
- STALE;
- OFFLINE.

Trust levels:

- UNTRUSTED;
- LIMITED;
- TRUSTED;
- HIGH_TRUST.

Trust is independent from presence and independent from person identity confidence.

## 11. Device Agent Contract

Every AGNES-capable edge device may run a Device Agent exposing controlled capabilities.

Conceptual responsibilities:

- device identity;
- capability declaration;
- connectivity/heartbeat;
- device-native presence signals;
- local cache;
- local reminders/alarms where permitted;
- secure communication with Live Gateway;
- offline outbound command queue;
- authentication requests;
- push/voice endpoints where supported.

The agent must not implement household business rules that belong to Core.

## 12. Device Heartbeat and Health

Agents emit `device.heartbeat.v1` with minimal operational metadata:

- `device_id`;
- timestamp;
- connection information;
- battery optional;
- network type optional;
- changed capabilities optional;
- agent version.

Heartbeat is not high-frequency telemetry. The purpose is device reachability and freshness.

Missed heartbeat progression:

```text
ONLINE -> STALE -> OFFLINE
```

Thresholds are configuration, not AI prompt text.

## 13. Device Enrollment and Revocation

New-device enrollment:

```text
Install Agent
 -> authenticate person
 -> pair with household
 -> generate/register device credential
 -> capability negotiation
 -> trust assignment
 -> device.registered.v1
```

Each device has its own revocable cryptographic identity. Private device credentials stay in platform-secure storage where available.

No shared household secret is reused as the permanent credential for all devices.

Revocation emits `device.revoked.v1` and must:

- reject future sync/authentication;
- invalidate active sessions/refresh credentials as applicable;
- disable push routing for that device;
- remove the device from trusted target selection;
- reject pending protected commands associated with the revoked credential.

## 14. Identity Context

Every material request carries an explicit identity context:

- actor;
- household;
- device;
- session;
- authentication strength;
- requested capability;
- correlation id.

Identification and authentication are separate.

A voice system may infer `likely_person` with confidence, but that inference is not proof for protected actions.

## 15. Authentication Strength

Live Core v2 defines these authentication levels:

- `ANONYMOUS`;
- `SESSION_KNOWN`;
- `DEVICE_TRUSTED`;
- `USER_AUTHENTICATED`;
- `STRONG_AUTHENTICATED`.

Examples:

- shared tablet in household mode: `SESSION_KNOWN` or `DEVICE_TRUSTED` depending on enrollment;
- unlocked personal authenticated phone: `USER_AUTHENTICATED`;
- fresh biometric/platform confirmation: `STRONG_AUTHENTICATED`.

Sensitive capabilities can require a minimum authentication level and a maximum age of strong authentication.

## 16. Capability Policy

The existing Core capability model is extended from generic view/suggest/act into named capabilities.

Examples:

- `calendar.read`;
- `calendar.create`;
- `family.location.view`;
- `family.message.send`;
- `shopping.list.modify`;
- `smart_home.light.control`;
- `door.unlock`;
- `purchase.confirm`;
- `finance.transfer`;
- `health.private.read`.

A policy decision considers:

```text
Actor
+ Device trust
+ Authentication strength
+ Capability
+ Resource visibility
+ Context
+ Risk
 -> ALLOW | DENY | REQUIRE_CONFIRMATION | REQUIRE_STRONG_AUTH
```

LLMs do not produce the authoritative policy decision.

## 17. Resource Visibility

Resource visibility is independent from capability permission.

Initial visibility scopes:

- PRIVATE;
- PERSON_SELECTED;
- PARENTS;
- HOUSEHOLD;
- SYSTEM_ONLY.

Presence never grants access by itself.

A shared screen must not automatically reveal private health data, financial values, private messages, sensitive calendar titles, authentication codes or private memories simply because the person is nearby.

## 18. Children and Shared Devices

Children are first-class person identities governed by role/policy profiles rather than hard-coded names.

A child profile may be allowed to:

- view own schedule;
- acknowledge own reminders;
- use learning/entertainment capabilities;
- request ordinary household information.

It does not automatically permit:

- parent-private data;
- permission changes;
- purchases;
- sensitive finance;
- protected security actions.

Shared tablet/TV devices default to `HOUSEHOLD_SESSION`. Personal/private views require a temporary authenticated personal session, which times out back to household mode.

## 19. Step-Up Authentication

When a legitimate request lacks sufficient authentication strength, AGNES should prefer controlled step-up authentication over a generic rejection where policy permits.

Flow:

```text
Request
 -> capability requires stronger authentication
 -> create short-lived approval challenge
 -> authenticate on trusted personal device
 -> bind approval to action_id + actor_id + device_id + expiry
 -> continue exact pending action
```

An approval cannot be replayed for a different action.

Offline state may never increase authority beyond the most recently validated cloud policy.

## 20. Material Command Envelope

Protected/material commands carry:

- `command_id`;
- `actor_id`;
- `device_id`;
- `capability`;
- `resource`;
- `authentication_level`;
- `idempotency_key`;
- `created_at`;
- `expires_at`;
- `correlation_id`.

Expired material commands are rejected with a structured outcome such as `COMMAND_EXPIRED`. Reconnection must not cause stale sensitive actions to execute later.

## 21. Notification Candidate Model

Raw domain events never directly interrupt the user.

A notification candidate includes:

- audience;
- urgency;
- expiry;
- acknowledgement requirement;
- allowed channels;
- preferred channels;
- quiet-hours policy;
- repeat policy;
- correlation id;
- related situation/fingerprint.

Audience types may include:

- ONE_PERSON;
- MULTIPLE_PEOPLE;
- PARENTS;
- CHILD;
- WHOLE_HOUSEHOLD;
- AVAILABLE_RESPONSIBLE_ADULT.

## 22. Delivery Channels

Initial channels:

- SILENT_FEED;
- IN_APP;
- MOBILE_PUSH;
- TABLET_ALERT;
- TV_BANNER;
- VOICE_HOME;
- VOICE_PERSONAL_DEVICE;
- CRITICAL_ALARM.

Channel selection depends on audience, presence, device health/trust, urgency, attention state, acknowledgement requirements and privacy.

An absent person should not receive a household voice announcement in an empty room simply because a home speaker is online.

## 23. Notification Routing

Routing flow:

```text
Target audience
 -> current presence
 -> attention state
 -> reachable devices
 -> device trust/privacy suitability
 -> allowed channels
 -> preferred channel
 -> verified delivery
```

Delivery remains verified before state becomes `delivered`.

Escalation is policy-controlled and only valid for candidates that explicitly allow it. Travel deals and ordinary shopping suggestions do not escalate as critical alerts.

## 24. Voice Architecture

Voice is an I/O layer, not a separate business-logic system.

Conceptual flow:

```text
Microphone
 -> VAD/session capture
 -> SpeechToTextPort
 -> identity/device context
 -> structured intent
 -> Core orchestration/policy
 -> result
 -> TextToSpeechPort
 -> selected target speaker/device
```

Raw audio is ephemeral by default. Persisted artifacts are structured intent/result, explicit memory when approved, and audit metadata when required.

The system must not depend on permanent 24/7 raw-audio storage.

## 25. Voice Response Levels

Voice output levels:

- SILENT;
- VISUAL_ONLY;
- SHORT_CHIME;
- SHORT_VOICE;
- FULL_VOICE;
- CRITICAL_VOICE.

Voice verbosity is a routing/interaction decision. Low-value events should not cause full spoken responses.

Protected actions requested by voice still require normal capability and authentication policy.

## 26. Notification Acknowledgement

Acknowledgement states/actions include:

- ACK;
- SNOOZE;
- DISMISS;
- ESCALATE where policy allows.

Acknowledgement can arrive from push, tablet, voice or another authorized device and emits a canonical event such as `notification.acknowledged.v1`.

Acknowledgement must preserve correlation with the originating situation and notification.

## 27. Local Operational Cache

Important devices may cache only projections required for offline operation, including selected subsets of:

- today/next schedule;
- active alerts;
- household presence projection;
- routines;
- shopping list;
- selected offline recipes;
- device permissions snapshot;
- small local context.

Devices do not receive a general full clone of cloud PostgreSQL.

## 28. Offline Command Queue

When internet is unavailable, permitted device actions enter a local queue.

Each queued command includes:

- action/command id;
- device id;
- actor id;
- type;
- payload;
- created time;
- idempotency key;
- base version optional;
- local status.

On reconnect:

```text
Authenticate device
 -> submit pending commands
 -> validate policy/freshness/expiry
 -> resolve conflicts
 -> apply allowed commands
 -> return canonical state
```

Offline authority is never broader than previously validated policy.

Offline-safe capability examples may include local alarms, known routines, cached-alert acknowledgement and selected local smart-home actions. Purchases, permission changes, new trusted-device enrollment and financial actions are not permitted solely because a device was previously online.

## 29. Conflict Resolution

Conflict policy is domain-specific.

Examples:

- shared shopping list: merge operations where semantics are safe;
- presence: freshest valid high-confidence signal;
- provider calendar: authoritative provider wins;
- permissions: cloud authoritative;
- sensitive configuration: reject stale update;
- contradictory memories: preserve provenance and flag inconsistency.

Mutable shared records participating in offline sync carry sufficient version metadata to reject unsafe stale writes.

## 30. Situation Lifecycle

A live situation has an explicit lifecycle:

- DETECTED;
- ACTIVE;
- UPDATED;
- RESOLVED;
- EXPIRED.

Structured fields:

- id;
- type;
- household id;
- related entities;
- confidence;
- urgency;
- supporting factors;
- first detected time;
- last updated time;
- expiry;
- fingerprint;
- state.

Situation detectors do not directly notify users.

## 31. Situation Fingerprints and Deduplication

A logical situation fingerprint uses stable dimensions such as:

- household;
- situation type;
- related entities;
- relevant time window.

Repeated provider updates with the same logical meaning update the same active situation rather than create repeated user interruptions.

A material-change policy determines whether an updated situation is sufficiently different to re-surface.

Small changes such as a one-minute departure adjustment should not create a new alert. Large changes such as a materially earlier required departure may.

## 32. Bundling

Related signals are combined before notification routing.

Example inputs:

- rain expected;
- traffic delay;
- departure window approaching.

Desired output:

- one `DeparturePreparationSituation` containing all supporting factors;
- one ranked interruption candidate;
- one concise message explaining the combined reason.

This avoids independent weather, traffic and calendar alerts competing for attention.

## 33. Automation Engine Role

Automations use deterministic trigger-condition-action definitions.

Automation fields include:

- trigger;
- conditions;
- candidate action;
- autonomy level;
- idempotency key strategy;
- cooldown;
- expiry.

An automation creates a candidate action/situation update. It does not bypass the Decision, Attention or Permission engines and does not send push/voice directly.

## 34. Cooldowns and Anti-Annoyance

Candidate evaluation includes:

- was this already surfaced?;
- is the same topic active?;
- is the change material?;
- is the target busy/sleeping?;
- can this wait?;
- is the information still fresh?;
- can it be bundled with another active candidate?;
- is a cooldown in effect?;
- repetition penalty.

Cooldown values are configuration and tests, not prompt text.

Safety-critical alerts may use a different interruption policy but still require explicit classification and auditability.

## 35. Event-Loop Protection

Events include correlation, causation and origin metadata sufficient to avoid recursive side-effect loops.

Handlers subscribe explicitly to relevant event types. A notification-state change must not re-trigger the same situation detector simply because the context now contains a delivered notification, unless that behavior is intentionally designed and tested.

Idempotency remains mandatory for side-effecting handlers.

## 36. Orchestration Ownership

Responsibilities remain separated:

- Connectors: fetch/execute provider facts and actions;
- Normalizers: provider payload -> canonical data;
- Context Engine: maintain operational projections;
- Situation Engine: detect structured situations;
- Automation Engine: deterministic trigger logic;
- AI Gateway: interpretation, constrained planning, summarization, response composition;
- Decision Engine: interruption/action outcome ranking;
- Attention Engine: timing/interruption suitability;
- Permission Engine: authorization;
- Notification Router: target/channel selection;
- Delivery adapters: provider execution;
- Verification: confirm external success;
- Audit: record material/security-relevant actions.

No single component is allowed to collapse all of these responsibilities.

## 37. AI Boundary and Fallback

AI may:

- interpret ambiguous natural language;
- summarize supporting factors;
- generate concise natural-language explanations;
- rank soft candidates where deterministic policy permits;
- create constrained plans using explicitly allowed actions.

AI may not:

- invent live weather/location/route facts;
- override permissions;
- authenticate a person;
- silently execute a material external action;
- rewrite canonical source-of-truth state without a validated use case.

If AI is unavailable, deterministic calendar/weather/location/route context, situation detection, notification routing and safety policy continue operating.

## 38. Security Events

Canonical security events include:

- `device.registered.v1`;
- `device.trust_changed.v1`;
- `device.revoked.v1`;
- `identity.session_started.v1`;
- `identity.authentication_upgraded.v1`;
- `permission.denied.v1`;
- `permission.confirmation_required.v1`;
- `security.suspicious_activity.v1`.

Security events feed policy/audit first. They do not all become user-facing notifications.

## 39. Suspicious Activity

Examples of suspicious behavior:

- revoked device repeatedly reconnecting;
- repeated failed strong-auth attempts;
- unexpected protected-capability requests;
- replay of expired offline commands;
- duplicate action token use;
- impossible device/session state.

Security response may include blocking, session invalidation, forced re-authentication, device revocation, audit and an alert only when warranted.

## 40. Audit Requirements

Material/security-relevant audit records answer:

- who requested the action;
- what capability/action was requested;
- from which device/session;
- at what authentication level;
- which policy decision applied;
- which provider/tool action ran;
- whether external verification succeeded;
- the correlation id.

Ordinary low-risk queries such as a weather question do not require the same security-audit depth as protected external actions.

## 41. HouseholdContext v2

`HouseholdContext` evolves without provider coupling.

In addition to Core v1 fields, the live projection must support canonical state for:

- `currentWeather` with freshness;
- `travelConditions` with freshness;
- `presenceByPerson` including state/confidence/sources;
- `deviceStates` including reachability/trust/capabilities;
- active situations with lifecycle/fingerprint;
- open notifications and routing-relevant acknowledgement state;
- attention state by person.

Existing `peoplePresent` and `peopleAway` projections may remain as derived compatibility views during migration, but `presenceByPerson` becomes the richer source for Live v2 decisions.

## 42. First Live v2 End-to-End Slice

The first implementation slice must prove this sequence:

1. a trusted phone agent enters the HOME geofence;
2. the phone emits a canonical boundary/location signal;
3. the Presence Resolver produces `person.presence.changed.v1`;
4. `HouseholdContext` materializes the presence update;
5. an upcoming calendar event is already present;
6. a fresh weather snapshot indicates meaningful rain risk;
7. a fresh route estimate indicates travel delay;
8. detectors create relevant structured candidates;
9. bundling creates one departure-preparation situation;
10. deterministic decision/attention/policy permits one suggestion;
11. the router chooses the correct reachable/trusted device/channel;
12. push or voice delivery is verified before success state;
13. the user acknowledges;
14. audit/learning state records the outcome;
15. repeated unchanged provider inputs create no duplicate logical alert.

This slice extends, rather than replaces, the verified Core v1 calendar-to-notification slice.

## 43. Required Negative Scenarios

The implementation plan must include tests proving at least:

1. stale location does not produce confident presence;
2. expired weather is not used as live weather fact;
3. duplicate weather/location updates do not create duplicate notification candidates;
4. a non-material route change does not re-alert;
5. AI unavailable does not break deterministic live flow;
6. untrusted/shared device cannot perform a protected capability without the required step-up;
7. denied protected action causes zero external side effect;
8. delivery-provider failure never becomes delivered success;
9. revoked device cannot sync or authorize a pending protected command;
10. expired offline command is rejected on reconnect;
11. notification state changes do not create detector loops;
12. privacy scope prevents inappropriate private-data routing to shared displays.

## 44. Provider Strategy

Provider-specific selections remain adapters and may evolve independently.

Core ports required conceptually:

- `WeatherPort`;
- `LocationPort` / device-signal ingestion port;
- `RoutingPort`;
- `NotificationDeliveryPort`;
- `SpeechToTextPort`;
- `TextToSpeechPort`;
- device authentication/enrollment ports;
- push-token/device-channel registration ports.

The design intentionally does not lock a specific weather, maps, push or speech vendor before implementation planning and provider evaluation.

## 45. Reliability and Degraded Operation

If AI fails:

- deterministic live facts/rules continue;
- template-based push/voice responses remain available where delivery adapters work.

If one weather provider fails:

- a configured semantic-equivalent fallback may be used;
- freshness/confidence must still be explicit.

If routing fails:

- AGNES must not invent a travel time;
- the departure situation should degrade or suppress depending on remaining evidence.

If cloud connectivity fails:

- selected cached schedule/routines/local alarms may continue on an authorized device;
- fresh remote weather, traffic and family location are not assumed;
- locally queued commands remain subject to expiry, policy and conflict checks on reconnect.

## 46. Privacy Baseline

Live Core v2 adopts privacy-minimizing defaults:

- semantic place/presence over continuous coordinate history;
- precise coordinates only when needed;
- ephemeral raw audio by default;
- device-specific projections instead of whole-database replication;
- explicit privacy scopes;
- shared-display shielding;
- revocable per-device identity;
- no voice-only authorization for protected actions;
- `UNKNOWN` rather than fabricated presence;
- explicit freshness rather than silent stale-data reuse.

## 47. Learning Signals

Live v2 may capture:

- ACK;
- DISMISS;
- SNOOZE;
- IGNORE;
- ACCEPT;
- COMPLETE.

Learning may tune ranking, timing, channel preference and repetition penalty.

Learning does not silently modify:

- permission policy;
- authentication requirements;
- canonical live facts;
- sensitive-action confirmation rules.

## 48. Acceptance Criteria

Live Core v2 design is successfully implemented when all of the following are true:

1. Weather, location/presence and route data enter Core through provider-neutral ports and canonical normalization.
2. Live facts carry explicit freshness and stale/expired values cannot masquerade as current facts.
3. HouseholdContext materializes richer presence, device, weather and route state.
4. Device agents authenticate independently and can be revoked independently.
5. Protected actions use deterministic capability policy and step-up authentication where required.
6. Voice is an I/O adapter and cannot bypass policy/security.
7. Raw live events do not directly interrupt users; they pass through situation, bundling, decision and routing layers.
8. Duplicate and non-material updates do not produce notification spam.
9. Delivery success is verified and acknowledgement remains correlated end-to-end.
10. Offline operation is projection/command based rather than whole-database replication.
11. AI-unavailable mode retains deterministic household operation.
12. The complete first Live v2 slice and required negative scenarios pass automated tests and CI.
13. No final UI/UX architecture is introduced as part of this phase.

## 49. Recommended Implementation Sequence

The implementation plan should preserve a mechanisms-first order:

1. canonical live data contracts and freshness;
2. weather/location/routing ports and deterministic fake adapters;
3. presence resolver and context projection;
4. device identity, heartbeat, trust and revocation;
5. authentication strength and capability policy extension;
6. notification routing model and verified push adapter contract;
7. voice STT/TTS/session ports with deterministic test doubles;
8. situation lifecycle, fingerprints and deduplication;
9. bundling/material-change/cooldown logic;
10. offline projection and command-queue contracts;
11. first Live v2 end-to-end slice;
12. reliability/privacy/security negative scenarios;
13. production adapter integration and operational hardening;
14. UI/UX remains last.

## 50. Design Decision Summary

Live Core v2 is intentionally a live operational substrate rather than a collection of new feature screens.

Key decisions:

- hybrid phone/home-device + cloud Core;
- device-authoritative location with privacy-minimizing storage;
- multi-signal presence resolution with `UNKNOWN` as a safe state;
- fresh/stale/expired semantics for all live facts;
- provider-neutral weather, routing, push and speech ports;
- per-device cryptographic identity and revocation;
- explicit authentication strength and named capabilities;
- step-up authentication for protected actions;
- shared-device privacy shielding;
- voice as I/O only;
- device-specific offline projections and queued commands, not database mirroring;
- situation lifecycle + fingerprinting + material-change thresholds;
- deterministic automation candidates rather than direct notifications;
- bundling before interruption;
- verified delivery and correlated acknowledgement;
- AI fallback preserving core household operation;
- visual design remains deferred.

After user approval of this written specification, the next step is a separate detailed TDD implementation plan for AGNES Live Core v2.