# AGNES Greenfield Core Design

Date: 2026-08-30
Status: Design specification for user review
Repository: `k25vsgvkmw-code/agnes-tv`

## 1. Product Definition

AGNES is a unified Personal & Family Operating System. It is not a collection of legacy screens, mini-apps, or a chatbot wrapped in navigation. The system must understand household context, combine data from external services, rank what matters now, prepare or execute allowed actions, and present the minimum useful information at the right moment.

The build order is intentionally backend-first:

1. Core architecture and domain boundaries
2. Household graph and canonical data model
3. Event bus and context engine
4. Integration gateway and connectors
5. Memory, priority, automation, notifications
6. AI orchestration and opportunity intelligence
7. Security, permissions, audit, observability
8. UI/UX and visual design last

Legacy AGNES TV UI, navigation, screen structure, and implementation are not inherited by default. The pre-greenfield repository state is preserved on `backup/pre-greenfield-2026-08-30`.

## 2. Architecture Style

AGNES v1 uses a modular core with event-driven boundaries. It starts as one deployable application where practical, but internal modules communicate through explicit contracts so a module can later become an independent service without rewriting consumers.

The architecture avoids both extremes:

- no large monolithic manager that owns all behavior;
- no premature fleet of microservices.

Core modules:

- identity
- household
- entities
- events
- context
- permissions
- memory
- automations
- notifications
- integrations
- intelligence
- opportunities
- audit

Each module is organized conceptually into:

- domain
- application
- ports
- adapters
- tests

No module may call a provider SDK directly from domain logic. Provider-specific code lives behind adapters.

## 3. Runtime Model

The system has five logical layers:

1. **Domain layer** — canonical entities, invariants, decisions, policies.
2. **Application layer** — use cases, workflows, orchestration.
3. **Event layer** — domain events, durable events, jobs, retries.
4. **Integration layer** — external providers, device APIs, push, AI models.
5. **Presentation layer** — added after the core is working; web/mobile/tablet/TV/voice consume the same application contracts.

The AI model is an intelligence layer, not the source of truth, not the database, not the authorization engine, and not the execution authority.

## 4. Data Strategy

AGNES uses a hybrid local-first plus cloud-sync model.

### Device-local state

Devices may cache:

- current and next-day operational context;
- recent calendar state;
- routines and reminders needed offline;
- shopping lists and selected cached recipes;
- temporary voice/session context;
- UI preferences;
- pending offline actions.

### Cloud-authoritative AGNES state

AGNES cloud stores canonical household state including:

- household graph;
- AGNES-owned events and tasks;
- routines;
- permissions;
- shared preferences;
- automations;
- memory records;
- connector metadata;
- notification state;
- audit records;
- opportunity history.

### External authoritative sources

When a provider owns the truth, AGNES does not pretend otherwise. Examples:

- Google Calendar remains authoritative for Google Calendar events;
- Apple Health or Health Connect remains authoritative for imported health measurements;
- Spotify remains authoritative for Spotify media state.

Imported records store a canonical AGNES representation plus an external reference and synchronization metadata.

## 5. Canonical Entity Model

Initial canonical entities:

### Household

Fields:

- id
- name
- timezone
- locale
- home_location_id
- status
- created_at
- updated_at

### Person

Fields:

- id
- household_id
- display_name
- role
- birth_date optional
- locale
- timezone
- permissions_profile_id
- status
- created_at
- updated_at

### Device

Fields:

- id
- household_id
- owner_person_id optional
- type
- platform
- capabilities
- trust_level
- last_seen_at
- status

### Place

Fields:

- id
- name
- type
- latitude optional
- longitude optional
- address optional
- timezone optional
- source

### Pet

Fields:

- id
- household_id
- name
- species
- birth_date optional
- care_profile
- status

### Vehicle

Fields:

- id
- household_id
- name
- make
- model
- year optional
- metadata
- status

### CalendarEvent

Fields:

- id
- household_id
- owner_person_id optional
- title
- description optional
- starts_at
- ends_at
- timezone
- participants
- location_id optional
- recurrence optional
- visibility
- status
- external_reference_id optional

### Task

Fields:

- id
- household_id
- title
- assignee_person_id optional
- due_at optional
- priority
- status
- source
- visibility

### Routine

Fields:

- id
- household_id
- name
- trigger definition
- steps
- participants
- status

### Notification

Fields:

- id
- household_id
- audience
- urgency
- message key and structured payload
- delivery channels
- acknowledgement requirement
- repeat policy
- expiry
- state

### Automation

Fields:

- id
- household_id
- trigger
- conditions
- actions
- autonomy level
- enabled
- last_run_at

### Opportunity

Fields:

- id
- household_id
- category
- source
- title
- normalized value/cost fields
- time window
- relevance score
- urgency score
- confidence score
- expiry
- surfaced state

### MemoryRecord

Fields:

- id
- household_id
- person_id optional
- category
- fact
- source
- confidence
- scope
- created_at
- last_used_at optional
- expires_at optional
- user_confirmed

### ExternalReference

Fields:

- id
- provider
- external_id
- external_version optional
- etag optional
- sync_token optional
- last_synced_at
- authoritative

## 6. Household Graph

Canonical entities form a household graph. Relationships include:

- person belongs_to household
- person owns device
- person attends event
- person responsible_for task
- person prefers preference
- person located_at place
- household owns vehicle
- household cares_for pet
- event occurs_at place
- event involves person
- trip includes person

The graph is a logical domain model. Initial persistence can remain relational in PostgreSQL; a graph database is not required for v1.

## 7. Universal Event Contract

Every meaningful system change may emit an `AgnesEvent`.

Required envelope fields:

- id
- type
- version
- occurred_at
- received_at
- source
- household_id
- actor_id optional
- entity_type optional
- entity_id optional
- correlation_id optional
- causation_id optional
- payload
- metadata

Event names are namespaced and versioned, for example:

- `calendar.event.created.v1`
- `calendar.event.updated.v1`
- `weather.rain_expected.v1`
- `person.location.changed.v1`
- `routine.started.v1`
- `task.overdue.v1`
- `travel.price_changed.v1`
- `connector.auth_expired.v1`
- `notification.acknowledged.v1`

`correlation_id` groups one end-to-end flow. `causation_id` points to the event that directly caused the next event.

## 8. Event Bus and Durability

AGNES uses two event paths:

### Internal domain bus

Used for synchronous or near-synchronous communication inside the same application process.

### Durable event queue

Used for:

- integrations;
- notifications;
- background jobs;
- retries;
- long-running operations;
- delayed work.

Critical domain mutations use a transactional outbox pattern:

1. update domain data;
2. insert outbox event in the same database transaction;
3. commit;
4. worker publishes outbox records to the durable queue;
5. mark publication state.

All write-capable handlers support idempotency keys where duplicate execution could create duplicate state or side effects.

## 9. Context Engine

The Context Engine maintains a materialized operational view of the household instead of recomputing all state from source tables for every request.

`HouseholdContext` includes:

- timestamp;
- who is home;
- who is away;
- active events;
- upcoming events;
- active tasks;
- urgent tasks;
- current weather;
- travel/traffic conditions;
- active routines;
- device states;
- open notifications;
- per-person attention state;
- detected situations.

Context updates are driven primarily by events. Scheduled refreshes are used only where a provider cannot push or delta-sync updates.

## 10. Situation Engine

Situation detectors analyze context and emit structured situations. Initial detector families include:

- morning preparation;
- school departure;
- work shift soon;
- school pickup;
- cooking window;
- bedtime;
- weather risk;
- late departure risk;
- match tonight;
- travel planning window;
- missed task;
- free-time opportunity.

A detector does not directly notify the user. It emits a `situation.detected` event with:

- situation type;
- confidence;
- related entities;
- supporting factors;
- expiry.

The Decision Engine decides whether that situation becomes an action, suggestion, notification, or no-op.

## 11. Intelligence Architecture

AGNES intelligence is split into explicit stages:

1. input interpretation;
2. context retrieval;
3. intent/situation detection;
4. candidate generation;
5. decision scoring;
6. policy and permission evaluation;
7. planning/orchestration;
8. tool execution;
9. verification;
10. state update;
11. response;
12. learning signal capture.

### Intent representation

Natural language is converted into structured intent fields such as:

- intent type;
- scope;
- time range;
- target people/entities;
- constraints;
- detail level;
- action goal.

### Decision score

The default decision ranking uses the conceptual model:

`relevance × urgency × impact × confidence × timing_quality - interruption_cost - repetition_penalty`

Exact coefficients are configurable and testable; they are not embedded in prompts.

## 12. Attention Engine

AGNES manages interruptions explicitly.

Per-person attention states include:

- available;
- busy;
- working;
- driving;
- sleeping;
- focused;
- unknown.

Every notification candidate has:

- urgency;
- expiry;
- audience;
- allowed delivery channels;
- repeat policy;
- acknowledgement requirement.

Low-value suggestions wait when the user is busy or sleeping. Safety-critical alerts may bypass normal suppression rules.

## 13. Autonomy Levels

Every action belongs to an autonomy class.

### Level 0 — Observe

Read and understand only.

### Level 1 — Suggest

Recommend an action without changing external or durable user state.

### Level 2 — Prepare

Perform reversible research/preparation, such as ranking options, drafting content, or preparing a route, but stop before a material external action.

### Level 3 — Act

Execute only actions permitted by policy and the user’s configured authority.

High-risk categories such as purchases, financial transfers, security access, or sensitive external communications require explicit confirmation and appropriate authentication regardless of general autonomy preferences.

## 14. Permission Model

Permissions are not a single boolean.

Each capability may distinguish:

- `CAN_VIEW`
- `CAN_SUGGEST`
- `CAN_ACT`

Visibility scopes include:

- private;
- shared with selected person;
- household;
- system.

Child, adult, guest, device, automation, and system actors may have different capability policies.

Sensitive actions require device/user authentication rather than relying solely on voice recognition.

## 15. Memory Architecture

Memory categories:

- identity memory;
- preference memory;
- routine memory;
- episodic memory;
- working memory.

Database facts, memories, and inferences are separate concepts.

Example:

- Fact: an event starts at 18:30.
- Memory: a person usually prefers leaving early.
- Inference: today the household should leave at 18:00.

A memory record includes source, confidence, scope, timestamps, optional expiry, and whether it was explicitly confirmed by the user.

Explicit user statements rank above behavioral inference. Behavioral learning may tune ranking and timing but must not silently rewrite critical policies or hard facts.

## 16. Learning Signals

Initial learning signals:

- accepted;
- rejected;
- ignored;
- snoozed;
- opened;
- completed;
- corrected.

Learning is applied primarily to ranking, timing, and relevance. It must remain inspectable and reversible.

## 17. Automation Engine

Automations use a structured trigger-condition-action model.

Example:

- trigger: event begins in 30 minutes;
- condition: outdoor activity and rain probability above threshold;
- action: create a weather-preparation suggestion.

Automation execution must:

- evaluate permissions;
- respect autonomy level;
- use idempotency keys;
- write audit records for material actions;
- verify external side effects before reporting success.

## 18. Opportunity and Never-Miss Engine

Travel deals, sports/events, deadlines, price drops, financial opportunities, household opportunities, and other time-sensitive candidates use one shared ranking framework.

Candidate evaluation considers:

- household relevance;
- time sensitivity;
- rarity;
- expected value;
- confidence;
- conflict with calendar/context;
- whether the opportunity has already been surfaced;
- interruption cost.

The engine stores surfaced/ignored/accepted state to prevent repeated low-value alerts.

## 19. Connector Framework

Every provider adapter implements a common connector contract conceptually equivalent to:

- connect;
- disconnect;
- health;
- capabilities;
- sync;
- subscribe;
- execute;
- refreshAuth.

Connector capabilities declare what is actually supported:

- read;
- write;
- subscribe;
- realtime;
- search;
- execute.

Core code calls domain/application ports such as `calendarPort.createEvent()` rather than provider SDK methods.

## 20. Normalization Layer

Raw provider data is mapped into canonical AGNES records before it enters domain logic.

Examples:

- Google Calendar data -> `CalendarEvent`;
- weather provider payload -> canonical weather snapshot/forecast;
- sports provider payload -> canonical fixture;
- travel provider payload -> canonical travel opportunity.

Provider-specific fields remain in adapter metadata only when needed for sync or provider actions.

## 21. Connector Registry and Health

The Connector Registry stores:

- connector id;
- provider;
- enabled state;
- capabilities;
- priority;
- fallback configuration where appropriate;
- health status;
- last health check;
- rate-limit state;
- authentication state.

Health states include:

- connected;
- degraded;
- auth expired;
- rate limited;
- error;
- disconnected.

Fallback providers are allowed only when semantics make sense. A weather provider may have a fallback; an authoritative calendar source is not silently replaced by another provider.

## 22. Sync Engine

Inbound sync pipeline:

1. receive provider change or scheduled delta request;
2. fetch changed records;
3. normalize;
4. validate;
5. deduplicate;
6. resolve version/conflict;
7. persist canonical record;
8. emit domain event.

Outbound sync pipeline:

1. AGNES action requested;
2. policy check;
3. enqueue sync/action command;
4. connector executes;
5. provider response captured;
6. verify external state;
7. update AGNES state;
8. emit outcome event.

Supported sync mechanisms, in priority order where applicable:

1. webhook/push;
2. delta sync;
3. polling;
4. manual refresh.

## 23. Conflict Resolution

Conflict strategy depends on domain semantics:

- simple AGNES-owned state: validated last-write semantics where safe;
- shared lists: merge operations;
- provider-owned records: authoritative provider wins;
- critical records: surface a conflict rather than silently overwrite;
- memory contradictions: preserve provenance and flag inconsistency.

All records that participate in sync include version/state metadata sufficient to detect stale writes.

## 24. Offline Behavior

Core offline-capable functions include:

- today/next schedule cache;
- routines;
- local reminders;
- shopping lists;
- cached recipes selected for offline use;
- selected local smart-home actions where the device/network supports them;
- pending user actions queued for later synchronization.

Offline writes enter a local sync queue. When connectivity returns, they are reconciled using the same conflict and idempotency rules as online writes.

## 25. Storage

Initial storage choices:

### PostgreSQL

Source of truth for AGNES-owned structured state, canonical imported records, permissions, automations, memories, connector metadata, audit records, and transactional outbox.

### Redis-compatible cache

Used only for ephemeral/live concerns such as:

- current materialized context cache;
- locks;
- rate limiting;
- temporary jobs/session data.

Business truth must not exist only in cache.

### Object storage

Used for media, photos, documents, generated artifacts, and larger blobs that do not belong in relational rows.

### Semantic/vector index

Added only for use cases that genuinely require semantic retrieval. It is not the default storage mechanism for ordinary facts.

## 26. AI Model Gateway

AI providers sit behind a model port. The system may route different workloads to different models in the future without changing domain behavior.

The gateway supports structured operations such as:

- intent extraction;
- constrained planning;
- summarization;
- natural-language response generation;
- semantic classification where rules are insufficient.

Model output used for actions must be validated against schemas and policy before tool execution.

The system must continue basic operation if AI services are unavailable. Calendar, tasks, routines, reminders, notifications, local state, and permitted deterministic automations remain operational.

## 27. Tool Registry and Orchestration

Executable tools are registered with metadata:

- tool id;
- input schema;
- output schema;
- permission requirement;
- risk level;
- provider/adapter;
- timeout;
- retry policy;
- idempotency behavior.

The Orchestrator selects tools based on structured intent and context. It may create multi-step plans for complex requests, but every material side effect passes policy and verification gates.

## 28. Verification Layer

AGNES must not report a side effect as completed until the target system confirms it or the system can verify state through a subsequent read.

Execution flow:

1. request action;
2. permission/policy validation;
3. execute connector/tool;
4. capture provider result;
5. verify target state where possible;
6. persist outcome;
7. emit event;
8. report success or failure accurately.

## 29. Audit and Observability

Material actions create `AuditRecord` entries containing:

- actor;
- action;
- target;
- source;
- timestamp;
- result;
- risk level;
- correlation id.

Observability must support tracing one user-visible outcome back through correlation and causation IDs to source events, decisions, connector calls, and verification results.

Operational telemetry must distinguish:

- application errors;
- connector failures;
- policy denials;
- model failures;
- rate limits;
- queue retries;
- sync conflicts.

## 30. Security Principles

Security design requirements:

- least-privilege connector scopes;
- encrypted secrets and tokens;
- no provider credential material in client logs;
- per-person authorization;
- explicit private/shared scopes;
- strong confirmation for high-risk actions;
- auditable external actions;
- revocable device trust;
- connector disconnect/re-auth paths;
- no voice-only authorization for sensitive actions.

## 31. Initial Connector Phases

### Phase 1 — Core household operation

1. Calendar
2. Weather
3. Location/Maps
4. Push notifications
5. Voice input/output
6. AI Model Gateway

### Phase 2 — Daily life

7. Spotify
8. Health
9. Smart Home
10. Email/Contacts

### Phase 3 — Opportunities

11. Travel
12. Sports
13. Entertainment
14. Shopping
15. Finance

A phase does not start merely because adapters can be coded. The previous phase must demonstrate reliable end-to-end domain behavior first.

## 32. First End-to-End Vertical Slice

The first implementation target is intentionally narrow:

`Calendar -> canonical event -> PostgreSQL -> domain event -> outbox -> context update -> situation detector -> decision engine -> notification candidate -> delivery -> acknowledgement/audit`

Acceptance scenario:

1. A real or test calendar event exists for a household member.
2. The connector imports it into the canonical model.
3. A domain event is emitted exactly once logically even if provider delivery retries.
4. Household context shows the event as upcoming.
5. A departure-risk detector can combine event time with a route/travel-time input.
6. The Decision Engine creates a suggestion only when the score/policy threshold is met.
7. The notification is delivered through an allowed channel.
8. Acknowledgement updates notification state.
9. Correlation data allows the whole chain to be inspected.
10. If the external provider or notification provider fails, AGNES reports failure/degraded state rather than false success.

This slice proves the core nervous system before Travel, Cooking, Sports, Finance, 3D, or other domain-heavy features are implemented.

## 33. Testing Strategy

Testing is required at several boundaries:

### Domain unit tests

- entity invariants;
- decision scoring;
- permission policy;
- situation detector behavior;
- conflict resolution;
- memory confidence/provenance rules.

### Contract tests

- connector input/output schemas;
- canonical normalization;
- event envelopes;
- tool registry contracts.

### Integration tests

- PostgreSQL transactions and outbox;
- queue delivery/retry;
- connector sync;
- idempotency;
- context materialization.

### End-to-end tests

- first calendar-to-notification slice;
- authentication expiration;
- provider retry duplication;
- offline queue reconciliation;
- permission denial;
- notification acknowledgement.

### Failure-injection tests

- connector timeout;
- rate limit;
- queue retry;
- duplicate webhook;
- stale version;
- AI unavailable;
- cache unavailable.

## 34. Error Handling Rules

Errors are typed rather than hidden in generic strings. Major categories:

- validation error;
- permission denied;
- authentication required;
- connector degraded;
- provider unavailable;
- rate limited;
- conflict detected;
- verification failed;
- timeout;
- transient infrastructure failure;
- permanent unsupported action.

Transient failures may retry according to tool/connector policy. Permanent failures do not retry indefinitely. User-visible messages are generated from structured error state, not invented by the AI layer.

## 35. Non-Goals for Core v1

Core v1 deliberately does not include:

- final visual design;
- 3D AGNES avatar implementation;
- large Travel UI;
- Cooking UI;
- Sports UI;
- Finance UI;
- full smart-home catalog;
- arbitrary autonomous purchases;
- one provider-specific architecture;
- vector database as general-purpose storage;
- dozens of microservices.

These are postponed until the first vertical slice proves the core architecture.

## 36. Definition of Core v1 Success

Core v1 is successful when:

1. the canonical household model is persisted and testable;
2. domain events are versioned, durable where required, and traceable;
3. transactional outbox prevents state/event divergence;
4. duplicate provider delivery does not duplicate logical actions;
5. the Context Engine maintains a reliable household operational view;
6. at least one situation detector produces structured, inspectable output;
7. permission and autonomy checks gate side effects;
8. one connector can import authoritative data through normalization;
9. one end-to-end calendar-to-notification flow passes including failures and retries;
10. basic operation remains possible when the AI provider is unavailable;
11. all material side effects are auditable;
12. no final UI architecture is required to prove any of the above.

## 37. Design Decisions Locked by This Specification

- Greenfield product; legacy screens are not the base.
- Modular core instead of premature microservices or a monolithic manager.
- Event-driven internal architecture.
- Hybrid local-first plus cloud synchronization.
- Canonical AGNES data model with external source-of-truth metadata.
- PostgreSQL as initial structured source of truth.
- Redis-compatible cache only for ephemeral/live state.
- Transactional outbox for durable event publication.
- Idempotent writes and retries.
- Context Engine plus Situation Engine before feature-heavy domains.
- AI as constrained reasoning/orchestration layer, not authority or database.
- Explicit autonomy levels and permission gates.
- Verification before user-visible success claims for side effects.
- One connector framework and registry.
- Phased integrations.
- UI/UX and visual design last.

## 38. Next Step After User Approval

After this specification is reviewed and approved, the next step is to create a detailed implementation plan that breaks Core v1 into small test-driven tasks, defines the initial project structure and technology choices, and specifies the first end-to-end calendar-to-notification vertical slice.

No implementation work starts before that approval.
