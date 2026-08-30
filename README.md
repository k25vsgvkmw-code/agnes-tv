# AGNES

Greenfield foundation for the unified AGNES Personal & Family Operating System.

## Core v1

AGNES Core v1 proves the first backend nervous-system slice from canonical calendar data through durable events, context, situation detection, deterministic policy/decision logic, verified notification delivery, acknowledgement/audit, and AI-independent fallback behavior.

Primary engineering references:

- [Approved greenfield Core design](docs/superpowers/specs/2026-08-30-agnes-greenfield-core-design.md)
- [Core v1 implementation plan](docs/superpowers/plans/2026-08-30-agnes-core-v1-implementation-plan.md)
- [Core v1 operations runbook](docs/core-v1-operations.md)

## Reset baseline

This branch intentionally starts from a clean product and technical foundation. No legacy AGNES TV UI, navigation, screen architecture, or implementation is inherited by default.

The previous repository state is preserved on:

`backup/pre-greenfield-2026-08-30`

## Build order

1. Core architecture and domain boundaries
2. Household graph and canonical data model
3. Event bus and context engine
4. Integration gateway and connectors
5. Memory, priority, automation, notifications
6. AI orchestrator and opportunity engine
7. Security, permissions, audit and observability
8. UI/UX and visual design last

## Verification

With PostgreSQL available through `DATABASE_URL`, install locked dependencies, apply the Core schema, and run all acceptance gates:

```bash
npm ci
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
npm run lint
npm run build
npm test
npm run format:check
```

The repository also contains `.github/workflows/core-ci.yml`, which performs the same Core v1 verification with PostgreSQL 18 on pull requests and pushes to `main`.

## Product principle

AGNES is one coherent Personal & Family Operating System, not a collection of legacy screens or disconnected mini-apps.

Final UI/UX and visual design are intentionally deferred until the Core v1 backend acceptance gates are green. The first vertical slice is deliberately backend-first so future domains attach to canonical contracts rather than dictate the architecture from individual screens.
