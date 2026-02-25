# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is CourseKit

A timetable engine for academic scheduling, published as two npm packages:
- **`@hfu.digital/coursekit-nestjs`** (`packages/backend/`) — NestJS module with domain services, storage adapters, and constraint system
- **`@hfu.digital/coursekit-react`** (`packages/frontend/`) — React hooks and components for timetable UI

## Development Commands

```bash
bun install              # Install all workspace deps
bun run build            # Build both packages (via Turborepo)
bun run typecheck        # Type-check both packages
bun run test             # Run all tests
bun run dev              # Watch mode for both packages
```

### Package-level commands

```bash
# Backend — uses bun:test, Bun bundler for JS, tsc for declarations
cd packages/backend
bun test                              # Run all tests
bun test src/__tests__/conflict.service.test.ts  # Single test file
bun run build                         # Build JS + type declarations

# Frontend — uses Vite + vite-plugin-dts
cd packages/frontend
bun run build                         # Vite library build (ES + CJS)
bun run typecheck                     # Type-check only
```

## Monorepo Structure

Turborepo workspace with `packages/*` and `examples/*` workspaces. Build tasks have `dependsOn: ["^build"]` — backend builds before frontend if needed. All packages use `tsconfig.base.json` at root (ESNext target, strict mode, `verbatimModuleSyntax`).

## Architecture

### Storage Adapter Pattern (Hexagonal)

The backend never imports `@prisma/client`. All persistence is behind abstract storage classes in `src/interfaces/`:

- `TimetableEventStorage` — events, exceptions, instructor/group associations
- `RoomStorage`, `InstructorStorage`, `GroupStorage`, `CourseStorage`
- `AvailabilityStorage`, `AcademicPeriodStorage`, `LocationDistanceStorage`

Concrete implementations:
- `src/adapters/prisma-*.adapter.ts` — Prisma adapters using structural typing
- `src/testing/memory-*.adapter.ts` — In-memory adapters for tests

All entity types are defined as plain interfaces in `src/interfaces/types.ts`. Custom adapters (Drizzle, TypeORM, etc.) extend the abstract storage classes.

### Domain Services

Registered via `CourseKitModule.register()` which accepts storage instances and optional custom constraints:

| Service | Purpose |
|---------|---------|
| `RecurrenceService` | RRULE parsing (via `rrule` lib), materializes recurring events into `MaterializedOccurrence[]` |
| `TimeService` | Interval overlap checks, gap calculations |
| `AvailabilityService` | CRUD + availability checking with hard/soft block rules |
| `ConflictService` | Evaluates all `ScheduleConstraint`s against materialized occurrences, supports `dryRun()` |
| `QueryService` | Schedule queries with entity filtering, free slot discovery |

### Constraint System

Constraints extend `ScheduleConstraint` (abstract class with `type`, `description`, and `evaluate()` method). Three built-ins: `OverlapConstraint`, `CapacityConstraint`, `AvailabilityConstraint`. Custom constraints are registered in `CourseKitModule.register({ constraints: [...] })`. Built-ins can be disabled with `enableBuiltInConstraints: false`.

### Domain Events

Uses `@nestjs/event-emitter`. All event names are constants in `DOMAIN_EVENTS` (e.g., `coursekit.event.created`). Typed payload interfaces are exported for subscribers.

### Key Type: MaterializedOccurrence

Recurring events are never queried as-is. `RecurrenceService.materialize()` expands them into `MaterializedOccurrence[]` for a `DateRange`, applying exceptions (cancelled/modified/added). This is the core data type consumed by constraints, queries, and the frontend.

### Optimistic Concurrency

`TimetableEvent` has a `version` field. `eventStorage.update()` accepts an optional `expectedVersion` parameter — throws `"Version conflict"` on mismatch.

### Frontend Package

React context provider (`CourseKitProvider`) accepts `apiUrl` and optional custom `fetch`. Hooks (`useTimetable`, `useAvailability`, `useConflictCheck`, `useMutation`, `useRoomSearch`) call the backend API. Components (`TimetableGrid`, `EventCard`, `ConflictBadge`, `AvailabilityOverlay`) are unstyled/minimal.

## Testing

Backend tests use `bun:test` with in-memory storage adapters — no database required. Test utilities are exported from `@hfu.digital/coursekit-nestjs/testing`:
- **Factories**: `createTestEvent()`, `createTestRoom()`, `createTestInstructor()`, etc.
- **Fixtures**: `simpleSchoolWeek`, `universitySemester`, `edgeCaseSchedule`
- **Helpers**: `EventSpy` for domain event assertions, `expectNoConflicts()`, `expectConflict()`

## Publishing

CI publishes on `v*` tags via GitHub Actions. Both packages are published to npm with `bun publish --access public`. The workflow runs `bun install --frozen-lockfile`, then `turbo build` and `turbo test` before publishing.

## Code Style

- 4-space indentation
- Bun only (never npm/yarn)
- TypeScript strict mode with `verbatimModuleSyntax`
- Backend tsconfig enables `experimentalDecorators` + `emitDecoratorMetadata` (NestJS requirement)
- All IDs are UUIDs
