# AGNES

Greenfield foundation for the unified AGNES Personal & Family Operating System.

## Reset baseline

This branch intentionally starts from a clean product and technical foundation. No legacy AGNES TV UI, navigation, screen architecture, or implementation is inherited by default.

The previous repository state is preserved on:

`backup/pre-greenfield-2026-08-30`

## Core v1

Core v1 establishes the canonical, provider-independent backend before final UI/UX implementation. The first verified vertical slice covers:

- household and person domain models;
- canonical calendar normalization and idempotent imports;
- PostgreSQL persistence and transactional outbox;
- versioned domain events and materialized household context;
- deterministic late-departure situation detection;
- capability policy and decision scoring;
- verified notification delivery, acknowledgement and audit;
- connector registry and health;
- durable outbox publication with retry/backoff;
- typed model-unavailable fallback;
- a composition root and end-to-end calendar-to-notification test.

Reference documents:

- [Core design](docs/superpowers/specs/2026-08-30-agnes-greenfield-core-design.md)
- [Core v1 implementation plan](docs/superpowers/plans/2026-08-30-agnes-core-v1-implementation-plan.md)
- [Core v1 operations](docs/core-v1-operations.md)

Production verification is defined by `.github/workflows/core-ci.yml` using Node.js 24 and PostgreSQL 18.

## Supermarket v1

Supermarket is a module inside the same AGNES core. Its first vertical slice adds:

- canonical retailers, products, retailer listings, immutable price observations and offers;
- AlphaMega, Lidl Cyprus and e-Kalathi provider adapters behind the common connector contract;
- conservative source refresh with per-retailer degraded health rather than bypassing provider controls;
- Offers-first deterministic ranking and seasonal presentation metadata;
- one household AGNES basket with unit-price comparison and single-versus-split retailer optimization;
- a default rule that avoids a second retailer unless the expected net saving is at least EUR 3;
- Checkout Model A: AGNES keeps the shopping flow through quote/revalidation and hands payment/order confirmation to the retailer when no supported direct checkout API exists;
- Fastify `/shopping/...` routes and provider-to-checkout automated verification.

Reference documents:

- [Supermarket v1 design](docs/superpowers/specs/2026-08-31-agnes-supermarket-v1-design.md)
- [Supermarket v1 implementation plan](docs/superpowers/plans/2026-08-31-agnes-supermarket-v1-implementation-plan.md)
- [Supermarket v1 operations](docs/supermarket-v1-operations.md)

Supermarket does not store retailer payment-card credentials and does not use undocumented/private checkout endpoints.

## Build order

1. Core architecture and domain boundaries
2. Household graph and canonical data model
3. Event bus and context engine
4. Integration gateway and connectors
5. Memory, priority, automation, notifications
6. AI orchestrator and opportunity engine
7. Security, permissions, audit and observability
8. UI/UX and visual design last

The final UI is intentionally deferred until the Core contracts and first vertical slices are stable and verified.

## Product principle

AGNES is one coherent Personal & Family Operating System, not a collection of legacy screens or disconnected mini-apps.
