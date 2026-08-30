# AGNES

Greenfield foundation for the unified AGNES Personal & Family Operating System.

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

## Health Bridge

AGNES Health Bridge is backend ingestion and truthful connector-status infrastructure for device-mediated Apple HealthKit and Android Health Connect data. It is not the final Health OS UI, coaching experience, or medical interpretation layer.

Health Bridge documentation:

- [Health Bridge design spec](docs/superpowers/specs/2026-08-30-agnes-health-bridge-design.md)
- [Health Bridge implementation plan](docs/superpowers/plans/2026-08-30-agnes-health-bridge-implementation-plan.md)
- [Core v1 operations runbook](docs/core-v1-operations.md)

The Health connector is counted as LIVE only when a real accepted measurement is fresh. A connected device with no fresh measurement remains `connected_no_data` and does not increase the live counter.

## Product principle

AGNES is one coherent Personal & Family Operating System, not a collection of legacy screens or disconnected mini-apps.
