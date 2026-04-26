# CourseKit + Website User-View Consolidation — Implementation Roadmap

> **Status:** approved canonical roadmap. Replaces the prior CourseKit scoping document.
> **Last updated:** 2026-04-26
> **Owner:** Nico Pergande (`google@nico-pergande.dev`)
>
> **How to use:** Each phase ships in its own PR and ends in a runnable, mergeable state. PR descriptions should reference the phase number from this document. Do not skip ahead — later phases depend on earlier ones.

---

## Context

Today the HFU timetable story is fragmented across four codebases:

- **`CourseKit/`** — generic timetable engine, integrated into `api/` for read-only use, **not consumed by `website/`**.
- **`splan-api/`** — separate public developer API (programs/semesters/courses/rooms/instructors/changes/webhooks/iCal) with its own database and StarPlan scraper.
- **`api/src/splan/`** — duplicate StarPlan scraper feeding `Ck*` Prisma tables for the main backend.
- **`better-splan/`** — full user-facing timetable app (Discord-auth, weekly grid, course visibility, split-lecture variants, iCal feeds, public browse pages) at `better-splan.hfu.digital`.
- **`website/app/me/timetable`** — hand-rolled grid hitting `splan/timetable`; ignores both `coursekit-react` and the public StarPlan API.

**Goal:** make the **website** the single authenticated user hub for everything timetable-related (semester selection, current courses, custom additional courses, weekly view, calendar export, change feed). Push every StarPlan-related concern into **CourseKit** so the open-source library serves any institution running StarPlan. Layer **HFU-specific** concerns (Discord notifications, in-app change feed, developer keys, audit, RBAC) on top in `api/`. Strip `better-splan/` down to a thin public marketing + browsing landing page. Retire `splan-api/` entirely; its public surface migrates to `api.hfu.digital/v1/starplan/*`.

### Decisions locked in
- **Versioning:** all Kits use **CalVer** `yyyy.mm.version` (e.g., `2026.05.1`, `2026.05.2`, `2026.06.1`). No semver. Applies to CourseKit, RoomKit, LoopKit, BoardKit.
- **splan-api/:** retire entirely; consumers migrate to `api.hfu.digital/v1/starplan/*`; `splan.dev.hfu.digital` 301-redirects.
- **better-splan/:** keep as thin public landing page (programs/teachers/rooms browse). Personal/auth features removed.
- **CourseKit scope:** library + optional NestJS controllers package (`@hfu.digital/coursekit-starplan-nestjs`).
- **Guest mode:** only on `better-splan/`, not on `website/`. Website is fully auth-gated.
- **Migration style:** **hard cutover** in one PR per phase. No feature flag.
- **Public dev API home:** `api.hfu.digital/v1/starplan/*` mounted on the main api.
- **Change history:** detection + ChangeLog in CourseKit (generic); notifications, Discord push, in-app feed, HFU webhooks in `api/`.

### Architectural target

```
                        ┌──────────────────────────────────────────┐
                        │        @hfu.digital/coursekit-*          │
                        │  (open source, CalVer yyyy.mm.version)   │
                        ├──────────────────────────────────────────┤
                        │ coursekit-nestjs       coursekit-react   │
                        │ coursekit-starplan     coursekit-starplan│
                        │   (engine: parse,        -nestjs         │
                        │    scrape, hash,         (mountable      │
                        │    ChangeLog,            controllers)    │
                        │    RRULE expand)                         │
                        └──────────────────────────────────────────┘
                                          ▲
                                          │ consumes
       ┌──────────────────────────────────┼─────────────────────────────────┐
       │                                  │                                 │
┌──────┴────────┐                ┌────────┴────────┐                ┌───────┴────────┐
│   api/        │                │   website/      │                │ better-splan/  │
│ (HFU layer)   │                │ (auth user hub) │                │ (thin browse)  │
├───────────────┤                ├─────────────────┤                ├────────────────┤
│ /v1/starplan/*│  ← retired splan-api lives here │ public /programs│
│ /me/* (HFU)   │                │ /me/timetable   │ /teachers      │
│ Discord       │                │ /me/courses     │ /rooms         │
│ in-app feed   │                │ /me/calendar    │ no auth        │
│ dev keys      │                │ /me/changes     │ uses /v1/      │
│ webhooks      │                │ admin /admin/*  │   starplan/*   │
│ HFU SAML SSO  │                │                 │                │
└───────────────┘                └─────────────────┘                └────────────────┘
```

`splan-api/` ceases to exist as a deployable service.

---

## Phase Map

| # | Phase | Repos touched | Outcome |
|---|---|---|---|
| 0 | Versioning + tooling foundations | All Kits | CalVer adopted; lint/format consistent; CourseKit ready for big changes |
| 1 | CourseKit core hardening | CourseKit | Domain errors, response DTOs, optimistic-locking surface, more tests |
| 2 | CourseKit StarPlan adapter (open source) | CourseKit | New package owns iCal parsing, content hashing, room/instructor extraction, RRULE expansion, sync orchestration, generic ChangeLog |
| 3 | CourseKit StarPlan NestJS controllers | CourseKit | New optional package mounts public endpoints (programs/semesters/courses/rooms/instructors/search/changes/ical/week) |
| 4 | api/: developer-key + webhook layer | api | HFU-specific developer registration, key rotation, webhook delivery (lifted from splan-api), audit |
| 5 | api/: mount StarPlan controllers + cron | api | `/v1/starplan/*` live; old `api/src/splan/starplan-scraper.service.ts` removed; `Ck*` Prisma tables now the only StarPlan storage |
| 6 | website/: user hub rebuild (hard cutover) | website | `/me/timetable`, `/me/courses`, `/me/calendar`, `/me/changes` — all CourseKit-backed |
| 7 | better-splan/: strip to public landing | better-splan | Auth/personal/admin removed; public browse uses `/v1/starplan/*` |
| 8 | splan-api/ retirement | splan-api, infra | DNS 301; data migrated to api/; deployment decommissioned; repo archived |
| 9 | Public dev API parity, docs, hardening | api, public-docs | OpenAPI updated; migration guide; rate limits; production cut at `2026.MM.1` |

---

## Phase 0 — Versioning + Tooling Foundations

**Why first:** the rework will produce many breaking changes in CourseKit. Settling versioning policy and lint tooling now means every later commit lands cleanly under one regime.

### 0.1 Adopt CalVer `yyyy.mm.version` across all Kits
- Update `package.json` `version` in every package of `CourseKit/`, `RoomKit/`, `LoopKit/`, `BoardKit/` to current month: `2026.04.1`.
- Update GH Actions `publish.yml` in each Kit to validate tags as `vYYYY.MM.N` regex before publishing.
- Document the convention in each Kit's root `README.md` and `CLAUDE.md`:
  > Versions follow CalVer: `yyyy.mm.version`. The first release of each calendar month bumps `version` to `1`. Within a month, increments are `2, 3, ...`. Versions are not semver-comparable; downstream consumers should pin exact versions and update intentionally.
- Critical files:
    - `CourseKit/packages/backend/package.json`
    - `CourseKit/packages/frontend/package.json`
    - `CourseKit/.github/workflows/publish.yml`
    - Equivalents in `RoomKit/`, `LoopKit/`, `BoardKit/`

### 0.2 Lint + format parity in CourseKit
- Add Biome (matching the rest of the platform) to CourseKit root: `biome.json`, `bun add -D @biomejs/biome`.
- Configure 4-space indent, single quotes, line width 100, `"all"` trailing commas.
- Add `bun run check` and `bun run check:fix` scripts at root and in each package.
- Wire into Turbo pipeline: `turbo.json` adds `check` task.
- Critical files:
    - `CourseKit/biome.json` (new)
    - `CourseKit/turbo.json`
    - `CourseKit/package.json` scripts

### 0.3 Domain-specific exception classes in CourseKit
- Create `packages/backend/src/errors/` with: `CourseKitError` (base), `EntityNotFoundError`, `VersionConflictError`, `ConstraintViolationError`, `InvalidRRuleError`, `StorageError`.
- Replace every `throw new Error('...')` with the appropriate subclass. Carry an `errorCode: string` enum for machine handling.
- Export from package root and re-export from `/testing` where useful for assertions.
- Critical files:
    - `CourseKit/packages/backend/src/errors/index.ts` (new)
    - All service files in `packages/backend/src/services/`
    - All adapter files in `packages/backend/src/adapters/`

### 0.4 Response DTO shape lock
- Define `OccurrenceDto`, `ConflictDto`, `AvailabilityDto` etc. as exported types.
- `QueryService.getSchedule()` returns these shapes (currently it leaks Prisma-ish structures).
- Add `zod` schemas for runtime validation in tests.

### Verification (Phase 0)
- `cd CourseKit && bun run check && bun run build && bun run test` passes.
- Tag `v2026.04.1` builds and publishes via the existing CI pipeline (dry-run via `npm publish --dry-run` first).

---

## Phase 1 — CourseKit Core Hardening

### 1.1 Optimistic-locking surface
- Document the `version` field semantics in `CLAUDE.md`.
- Add `update()` overloads on every storage interface that mutates entities (currently only `TimetableEvent`). Apply to `EventException`, `Availability`, `LocationDistance`.
- Throw `VersionConflictError` (from 0.3) on mismatch.

### 1.2 Test coverage uplift
- Target: >85% line coverage on `packages/backend/src/services/`. Use `bun test --coverage`.
- Add specs for: error paths in `RecurrenceService.validate`, `AvailabilityService.findFreeSlots` boundary cases, `ConflictService.dryRun`, version-conflict update scenarios.
- Add a `packages/backend/src/__tests__/contract.test.ts` that exercises every storage interface via in-memory adapters — this becomes the spec adapters must satisfy.

### 1.3 Frontend hooks polish
- `coursekit-react`: tighten `useTimetable` types so the response matches Phase 0.4 DTOs.
- Add `useChanges`, `useSemester`, `useCourseSubscriptions` hooks (will be used by website in Phase 6).
- Ensure `<TimetableGrid />` is configurable: study blocks pluggable, week start day pluggable (so non-HFU users can configure 5- or 6-day weeks).

### Verification (Phase 1)
- `bun run test` shows >85% coverage for `packages/backend/src/services/`.
- `coursekit-react` Storybook (if present) renders `TimetableGrid` with both 6-block-HFU and a generic 8-slot config.

---

## Phase 2 — CourseKit StarPlan Adapter (open source)

This is the core of the open-source rework: every StarPlan-aware feature today scattered across `splan-api/` and `api/src/splan/` lands in CourseKit.

### 2.1 New package `@hfu.digital/coursekit-starplan`
- Path: `CourseKit/packages/starplan/`. Add to `pnpm-workspace.yaml` (or `bun` workspaces) and `turbo.json`.
- `package.json` peer-deps: `@hfu.digital/coursekit-nestjs` (storage interfaces only; no NestJS dependency itself — keeps the package framework-agnostic).

### 2.2 Lifted modules
| Source | Destination | Adaptation |
|---|---|---|
| `splan-api/src/common/utils/ical-parser.ts` | `coursekit-starplan/src/parser/ical.ts` | Add **RRULE extraction** (currently splan-api treats each event standalone). Use `rrule` package already in CourseKit deps. |
| `splan-api/src/common/utils/content-hash.ts` (`generateContentHash`) | `coursekit-starplan/src/identity/content-hash.ts` | Pure function. Unchanged. |
| `splan-api/src/common/utils/content-hash.ts` (`parseRoomLocation`, `extractInstructorFromDescription`) | `coursekit-starplan/src/extract/` | **Parameterize** — accept a `RegexPatternSet` so non-HFU users can configure. Default export = HFU patterns. |
| `splan-api/src/sync/starplan-client.ts` | `coursekit-starplan/src/client/starplan-client.ts` | `StarPlanClient` constructor takes `{ baseUrl, planningUnit, locale }`. No hardcoded HFU URL. |
| `splan-api/src/sync/sync.service.ts` | `coursekit-starplan/src/sync/sync-service.ts` | Becomes framework-agnostic class that takes storage adapters from `coursekit-nestjs`. Cron scheduling moves to consumer (api/). |

### 2.3 Generic ChangeLog
- `coursekit-starplan/src/changes/change-detector.ts` — given previous and next entity snapshots, produces `ChangeRecord[]` with `entityType`, `entityId`, `action`, `previousData`, `newData`, `changedFields`.
- `coursekit-starplan/src/changes/change-storage.interface.ts` — abstract storage for change log persistence.
- Prisma adapter: `coursekit-starplan/src/adapters/prisma-change-log.adapter.ts` (structural typing, expects `prisma.ckStarPlanChangeLog` delegate).
- Emits `coursekit.starplan.change.detected` events via injected `EventEmitter`. **api/** subscribes (Phase 4).

### 2.4 RRULE expansion
- New `coursekit-starplan/src/recurrence/rrule-expander.ts` — given parsed iCal events, produces a normalized stream of `(eventDef, recurrenceRule)` pairs that map cleanly to `CkTimetableEvent.recurrenceRule`. Handles RFC 5545 edge cases (BYDAY, COUNT, UNTIL, EXDATE).
- Replaces "stored as string" hack currently in `api/src/splan/starplan-ical-parser.ts`.

### 2.5 In-memory + Prisma adapters
- In-memory adapter for testing in `coursekit-starplan/src/testing/memory-starplan.adapter.ts`.
- Prisma adapter that uses **the same `Ck*` tables** already in `api/`. Schema additions documented for consumer migration:
  ```prisma
  model CkStarPlanProgram { /* existing CkProgram extended with starplanId? icalHash? */ }
  model CkStarPlanChangeLog { id String @id; entityType String; entityId String; action String; previousData Json?; newData Json?; changedFields String[]; syncLogId String?; createdAt DateTime; }
  ```
- Provide a `prisma/migrations/coursekit-starplan-2026-04.sql` template consumers can copy.

### 2.6 Tests
- `coursekit-starplan/src/__tests__/`: parser fixtures (real HFU iCal samples + synthetic edge cases), content-hash idempotency, RRULE expansion, change detection diff correctness.
- Use `bun:test` to match the rest of CourseKit.

### Verification (Phase 2)
- `cd CourseKit/packages/starplan && bun run test` passes with >80% coverage.
- Integration test: feed a real HFU iCal sample through the full pipeline (parse → expand → upsert into in-memory storage → run again with modified sample → assert ChangeLog entries match expected diff).

---

## Phase 3 — CourseKit StarPlan NestJS Controllers (optional package)

### 3.1 New package `@hfu.digital/coursekit-starplan-nestjs`
- Path: `CourseKit/packages/starplan-nestjs/`.
- Depends on `coursekit-starplan` + `coursekit-nestjs`. Peer deps: NestJS 10–11.
- Exports `StarPlanModule.register({ ...adapters, authGuard?, throttlerConfig? })`.

### 3.2 Public read endpoints (mirror splan-api/v1/*)
Controllers and DTOs ported from `splan-api/src/`:

| Endpoint | Source | Notes |
|---|---|---|
| `GET /programs` | `splan-api/src/programs/` | Pagination, archived filter, search |
| `GET /programs/:id/semesters` | same | |
| `GET /programs/:id/courses` | same | weekday/studyBlock/date filters |
| `GET /semesters` | same | |
| `GET /courses`, `GET /courses/:id` | same | accept UUID or contentHash |
| `GET /rooms`, `GET /rooms/:id/availability` | same | |
| `GET /instructors` | same | |
| `GET /week/current`, `GET /week/:week`, `GET /week/:week/rooms` | same | ISO week parsing in CourseKit |
| `GET /search?q&type` | same | min 2 chars |
| `GET /changes`, `GET /changes/:id` | same | reads from generic ChangeLog from 2.3 |
| `GET /ical/:semesterId`, `GET /ical/:semesterId/url` | same | uses CourseKit RecurrenceService |
| `GET /export/programs`, `GET /export/semesters/:id`, `GET /export/courses`, `POST /export/custom` | same | json/csv/ical |
| `GET /sync/status` | new | reports last successful sync from `SyncLog` |
| `GET /statistics` | same | aggregate counts |

### 3.3 Auth/throttling pluggability
- Constructor option `authGuard: Type<CanActivate>` — consumer (api/) supplies its own (developer-key, JWT, session). No auth shipped in CourseKit beyond an `AllowAnonymousGuard` example.
- Constructor option `throttlerConfig?: ThrottlerOptions` — defaults to splan-api's 10/sec/60/min/1000/hour for parity.
- Constructor option `apiPrefix?: string` — defaults to `/v1/starplan`. Consumer can mount under any path.

### 3.4 OpenAPI
- Inline `@nestjs/swagger` decorators on every controller. Consumer mounts Swagger at their preferred path.
- Tag groups: `programs`, `semesters`, `courses`, `rooms`, `instructors`, `week`, `search`, `changes`, `ical`, `export`, `sync`.

### 3.5 Tests
- e2e tests using NestJS testing module + in-memory CourseKit adapters. Run with `bun:test`.

### Verification (Phase 3)
- Spin up a minimal example app in `CourseKit/examples/starplan-server/` that mounts `StarPlanModule` against in-memory adapters, hits each endpoint with `curl`, validates response shape against published OpenAPI.

---

## Phase 4 — api/: Developer-Key + Webhook Layer (HFU-specific)

This is the HFU-specific layer that wraps CourseKit's open-source primitives.

### 4.1 Database migration: lift Developer / Webhook / WebhookDelivery / UsageLog from splan-api → api/
- Add to `api/prisma/schema.prisma`:
  ```prisma
  model Developer { id String @id; email String @unique; apiKey String @unique; apiKeyHint String; isActive Boolean; createdAt DateTime; updatedAt DateTime; webhooks Webhook[]; usageLogs UsageLog[] }
  model UsageLog { id String @id; developerId String; endpoint String; method String; statusCode Int; createdAt DateTime; developer Developer @relation(fields:[developerId], references:[id]); @@index([developerId, createdAt]) }
  model Webhook { id String @id; developerId String; url String; secret String; isActive Boolean; filterScope String?; filterProgramId String?; filterSemesterId String?; filterCourseId String?; filterRoomId String?; filterInstructorId String?; eventTypes String[]; deliveries WebhookDelivery[]; developer Developer @relation(fields:[developerId], references:[id]) }
  model WebhookDelivery { id String @id; webhookId String; eventType String; payload Json; status String; attempts Int; nextRetryAt DateTime?; responseCode Int?; createdAt DateTime; deliveredAt DateTime?; webhook Webhook @relation(fields:[webhookId], references:[id]); @@index([status, nextRetryAt]) }
  ```
- Migration script `prisma/migrations/2026_xxxx_starplan_developer_layer/`.

### 4.2 Modules
- `api/src/starplan-developer/` — controllers + service for `/v1/starplan/developers/*` and `/v1/starplan/webhooks/*` (lifted from `splan-api/src/developers/` and `splan-api/src/webhooks/`).
- `api/src/starplan-developer/webhook-delivery.service.ts` — cron every 30s, exponential backoff `[0s, 1m, 5m, 15m]`, HMAC-SHA256 signature, lifted verbatim from splan-api.

### 4.3 DeveloperKeyAuthGuard
- `api/src/starplan-developer/developer-key.guard.ts` — validates `X-API-Key` header against `Developer.apiKey`, sets `req.developer`, logs to `UsageLog`.
- Extends `JwtOrBetterAuthGuard` pattern: `DeveloperKeyOrAnonymousGuard` for endpoints that allow either keyed or anonymous (with stricter rate limits for anonymous).

### 4.4 Change subscription bridge
- `api/src/starplan-notifications/` — listens for `coursekit.starplan.change.detected` events from CourseKit:
    - **Discord push:** publishes through existing `discordLogsApi` to relevant guilds.
    - **In-app feed:** writes to a new `UserChangeFeed` Prisma table per affected user (resolved via `ckCourseId` → user subscriptions).
    - **HFU webhook fan-out:** queues `WebhookDelivery` rows for matching webhook filters.
- Schema:
  ```prisma
  model UserChangeFeed { id String @id; userId String; changeLogId String; readAt DateTime?; createdAt DateTime; user User @relation(fields:[userId], references:[id]); @@index([userId, readAt, createdAt]) }
  ```

### 4.5 Audit
- Every developer registration, key rotation, webhook CRUD writes to existing `AuditLog` (already in `api/`).

### Verification (Phase 4)
- e2e test in `api/test/starplan-developer.e2e-spec.ts`: register dev → receive key → call `/v1/starplan/programs` with key → observe `UsageLog` entry; create webhook → trigger a change → assert `WebhookDelivery` queued and signed correctly.

---

## Phase 5 — api/: Mount StarPlan Controllers + Cron + Remove Old Scraper

### 5.1 Replace `coursekit/coursekit-registration.module.ts` with combined module
- New `api/src/coursekit/coursekit.module.ts` imports both `CourseKitModule.register(...)` and `StarPlanModule.register(...)` from `coursekit-starplan-nestjs`, wired with the same Prisma adapters (now also adapter for the new ChangeLog model).
- Mount `StarPlanModule` controllers at `/v1/starplan/*` via `apiPrefix` option from Phase 3.3.
- `authGuard: DeveloperKeyOrAnonymousGuard` from Phase 4.3.

### 5.2 Cron orchestration
- `api/src/starplan-sync/starplan-sync.service.ts` — `@Cron(EVERY_5_MINUTES)` calls the framework-agnostic `SyncService` from `coursekit-starplan` with HFU-configured `StarPlanClient` (HFU's `splan.hs-furtwangen.de` base URL, planning unit `5`).
- Uses NestJS DI to provide CourseKit storage adapters.

### 5.3 Delete duplicate code
- Remove `api/src/splan/starplan-scraper.service.ts`.
- Remove `api/src/splan/starplan-ical-parser.ts`.
- Remove `api/src/splan/starplan-ical-cache.service.ts`.
- Keep `api/src/splan/splan.service.ts` and `splan.controller.ts` only for the **HFU-specific** user features — split-lecture preferences, course visibility, variant selection. Rename to `api/src/me-timetable/*` for clarity (see Phase 6 wiring).

### 5.4 Drop `Ck*` ↔ legacy `Course/Program/Semester` bridge
- Plan a follow-up data migration: backfill `ckCourseId` for all rows; switch all reads to `Ck*`; drop legacy `Course/Program/Semester` tables in a later release window. **Not in this phase** — flag as Phase 9 task.

### Verification (Phase 5)
- `bun run test` in `api/` passes.
- Hit `https://api.hfu.digital/v1/starplan/programs` (staging) — gets same shape as old `splan-api/v1/programs`.
- 5-minute cron fires; `SyncLog` rows appear; `CkTimetableEvent` rows update; `CkStarPlanChangeLog` rows are written when iCal hash changes.
- `api/src/splan/starplan-scraper.service.ts` no longer in repo.

---

## Phase 6 — website/: User Hub Rebuild (hard cutover)

This is the user-visible heart of the project. Single PR replaces the existing thin `/me/timetable` and `/me/courses` with a full hub.

### 6.1 Add CourseKit dependencies
- `website/package.json`:
  ```json
  "@hfu.digital/coursekit-react": "2026.04.1",
  "@hfu.digital/coursekit-nestjs": "2026.04.1"
  ```
- Wrap app in `<CourseKitProvider apiBase="/api" fetch={authedFetch} />` in `app/providers.tsx`.

### 6.2 Routes
| Route | Replaces / new | Source of features |
|---|---|---|
| `/me/timetable` | replaces hand-rolled grid | better-splan `/timetable` + CourseKit `<TimetableGrid>` |
| `/me/courses` | new (currently a list page) | better-splan `/settings`: search, show/hide, variant select, semester selection, enroll/unenroll in additional courses |
| `/me/calendar` | new | better-splan `/calendar`: generate iCal feed URL, revoke, regenerate, include-hidden toggle, access stats |
| `/me/changes` | new | timeline of `UserChangeFeed` entries from Phase 4.4 |
| `/me/timetable` (week query) | uses `?week=YYYY-Www` | navigation arrows, "today" button |

### 6.3 Components
Replace bespoke with `coursekit-react`:
- Drop `website/components/timetable/weekly-grid.tsx` → `<TimetableGrid />`
- Drop `website/components/timetable/event-card.tsx` → `<EventCard />`
- New `<ConflictBadge />` shown on overlapping events
- New `<StudyBlockGrid />` for HFU's 6-block layout (configured via prop)

Port from better-splan (will land in `coursekit-react` itself, contributed back open source):
- `<CourseList />` (cards with visibility toggle + variant selector)
- `<PreferencesDiffDialog />` (local-vs-cloud conflict UX)
- `<WeekPicker />`
- `<SemesterPicker />`

### 6.4 Hooks
Use new hooks from Phase 1.3:
- `useTimetable({ week })` → `/api/v1/starplan/week/:week` filtered to user's subscribed `ckCourseId`s server-side.
- `useCourseSubscriptions()` → list current courses + visibility/variant.
- `useMutation` wrappers for `subscribe`, `unsubscribe`, `setVisibility`, `selectVariant`, `setSemester`.
- `useChanges({ since, scope: 'me' })` → `/api/v1/starplan/changes?scope=me&since=...`.
- `useICalFeed()` for `/me/calendar`.

### 6.5 HFU-specific user endpoints in api/
The "personal" features in better-splan today live at `/splan/courses`, `/splan/preferences/*`, `/splan/ical/*`. Reorganize under `/me/timetable/*`:
- `GET /me/timetable/courses` → user's `CkCourse` subscriptions with visibility + selected variants
- `PATCH /me/timetable/courses/:ckCourseId` → set visibility / variant
- `POST /me/timetable/courses/:ckCourseId/subscribe`
- `DELETE /me/timetable/courses/:ckCourseId/subscribe`
- `POST /me/timetable/preferences/compare` (local vs db diff)
- `POST /me/timetable/preferences/apply`
- `GET/POST/PATCH/DELETE /me/timetable/ical` — HFU-specific iCal feed with revocation
- `GET /me/timetable/changes` → user-scoped `UserChangeFeed`
- `PATCH /me/timetable/changes/:id/read` → mark read
- `PATCH /me/timetable/semester` → user picks current semester (writes `User.semesterId`)

### 6.6 i18n
- Carry over German + English keys from better-splan's `I18nProvider`. Adopt `next-intl` or replicate the existing custom provider pattern in website.
- This is the first user-facing area on website with full DE support; document the convention.

### 6.7 Preferences sync
Lift better-splan's local↔cloud diff system:
- `useLocalPreferences` (localStorage `hfu-timetable-preferences`)
- On login or first open, call `/me/timetable/preferences/compare`; if diffs, show `<PreferencesDiffDialog>` with options *use local / use db / merge*.

### 6.8 Hard cutover checklist
- Old `/me/timetable/page.tsx` deleted in same PR.
- Old `/api/splan/timetable` removed (or aliased to `/v1/starplan/week/:week` with user filtering).
- Single PR. Reviewer must verify visually: weekly grid renders, course list editable, calendar feed works, change feed populates after a manual scrape trigger.

### Verification (Phase 6)
- Run `bun run dev` in website, log in, see populated `/me/timetable`.
- `/me/courses`: toggle a course off, refresh → grid no longer shows it.
- `/me/courses`: search and add an additional course outside user's primary semester → new subscription persists.
- `/me/calendar`: generate iCal URL → fetch from external client (Google Calendar) → renders.
- `/me/changes`: trigger an admin sync (modify mapping or wait for cron) → new entry appears.
- Lighthouse a11y > 95 on `/me/timetable`.

---

## Phase 7 — better-splan/: Strip to Public Landing

### 7.1 Removed routes
- `/timetable` (auth-gated personal view)
- `/settings` (course settings)
- `/calendar` (iCal feed management)
- `/admin/*` (split-lecture admin)
- All Discord auth flow files.

### 7.2 Kept routes
- `/` — landing
- `/programs` — public list
- `/programs/[programId]/[semesterId]` — public timetable
- `/teachers`, `/teachers/[teacherId]`
- `/rooms`, `/rooms/[roomId]`

### 7.3 API client rewrite
- Replace `splan-api.ts` (currently pointing to `splan.dev.hfu.digital/api/v1`) with calls to `api.hfu.digital/v1/starplan/*`.
- Remove `api.ts` (HFU-authenticated client) entirely.
- Drop `public-api.ts` / keep only the parts still relevant (e.g., footer links).
- Drop `hooks/usePreferencesSync`, `useUserCourses`, `useICalFeed`, `useAuth`.

### 7.4 Navigation + branding
- Header CTA "Sign in for personal timetable" → `https://hfu.digital/me/timetable`.
- Remove Discord login button.
- Footer link "API for developers" → `https://api.hfu.digital/v1/starplan/docs`.

### 7.5 Reuse via `coursekit-react`
Now that `<TimetableGrid />` is in CourseKit, better-splan adopts it too — single source of truth for the grid layout.

### Verification (Phase 7)
- `bun run dev` in better-splan: all kept routes work without any auth.
- No imports of `@/lib/api.ts` (removed) anywhere.
- No `signInWithDiscord` references.
- No 404s when navigating from landing to programs to a semester page.

---

## Phase 8 — splan-api/ Retirement

### 8.1 Data migration
- One-time script `scripts/migrate-splan-api-to-api.ts`:
    - Copy `Developer`, `Webhook`, `WebhookDelivery`, `UsageLog` from splan-api DB → api DB.
    - Skip-on-conflict by `email` for `Developer` (manual reconciliation list emitted).
- Run on staging; verify counts; run on production during maintenance window.

### 8.2 DNS / ingress
- `splan.dev.hfu.digital` → 301 redirect to `api.hfu.digital`.
- Per-endpoint redirect map (`/api/v1/programs` → `/v1/starplan/programs`, etc.) at the load-balancer layer.

### 8.3 Deployment teardown
- Remove splan-api Kubernetes/Compose service.
- Drop splan-api PostgreSQL database (after a 14-day backup retention window).
- Archive `splan-api/` repo with a README pointing to `api/v1/starplan/*`.

### 8.4 Email developers
- Send notification to all `Developer` rows: new endpoint base URL, identical schemas, X-API-Key header still works, 6-month grace period during which 301 redirects are honored.

### Verification (Phase 8)
- `curl https://splan.dev.hfu.digital/api/v1/programs` → 301 → `https://api.hfu.digital/v1/starplan/programs` returning identical JSON.
- All `Webhook` rows still firing (manual test via "test webhook" endpoint).
- splan-api deployment no longer exists in cluster.

---

## Phase 9 — Public Dev API Parity, Docs, Hardening

### 9.1 OpenAPI parity
- Confirm every endpoint from the splan-api OpenAPI is present in the new `/v1/starplan/*` Swagger.
- Ship `public-docs/`-hosted migration guide:
    - URL mapping table
    - Auth header changes (none)
    - Rate limit changes (parity)
    - Pagination/parameter changes (none)

### 9.2 Tests + rate limits
- e2e suite covering the full `/v1/starplan/*` surface in `api/test/`.
- Rate limits applied at NestJS `ThrottlerGuard`: 10/sec, 60/min, 1000/hour for keyed; stricter (5/sec, 30/min, 200/hour) for anonymous.
- Tests for `/me/timetable/*` user endpoints — auth, ownership, rate limits.

### 9.3 Audit logging
- Audit entries on: developer registered/key rotated, webhook created/deleted, user changed semester, user toggled course visibility (debounced).

### 9.4 Drop legacy bridges
- Remove `Course/Program/Semester` legacy Prisma models. Backfill complete; all reads on `Ck*`.
- Remove `Course.ckCourseId` (`Ck*` is now the canonical model).

### 9.5 Versions cut
- Tag `CourseKit` as `v2026.MM.1` (publish all four packages).
- Pin `api/`, `website/`, `better-splan/` to that version.
- Cut RoomKit, LoopKit, BoardKit at `v2026.MM.1` for consistency (no functional changes — just version alignment).

### Verification (Phase 9)
- `bun run test` in `api/` and `CourseKit/` passes with >85% line coverage on the StarPlan path.
- Lighthouse + Biome lint clean across `website/`, `better-splan/`.
- OpenAPI rendered at `https://api.hfu.digital/v1/starplan/docs` shows full surface.
- Real iCal sample fed through cron → user receives change notification on Discord and `/me/changes`.

---

## Cross-cutting concerns

### Documentation
- This document is the canonical roadmap (`CourseKit/coursekit-implementation.md`).
- Update `CLAUDE.md` files in every affected repo to reflect the new architecture as phases land.
- Add `CourseKit/docs/starplan.md` walking through embedding the StarPlan adapter in any NestJS app.
- Update `public-docs/` with the new `/v1/starplan/*` endpoints.

### Authentication
- No changes to Better-Auth setup. Discord OAuth + HFU SAML SSO continue to work for the website.
- Developer-key auth for `/v1/starplan/*` is HFU-specific (Phase 4.3). CourseKit ships only an example anonymous guard.

### Observability
- Every CourseKit StarPlan domain event (`coursekit.starplan.*`) gets logged at INFO via the existing pino setup in api/.
- Discord notifications and webhook deliveries gated behind feature config flags (env vars), per existing pattern.

### Rollback
Hard cutover rollback strategy (since no flag):
- Each phase is one PR, revertable independently. Phase order is chosen so reverts are localized.
- Phase 5–6 are the riskiest (user-visible). Pre-deploy rehearsal in staging required, with a recorded smoke test of the four `/me/*` routes before merging.

### Open-source positioning
- CourseKit's README markets `@hfu.digital/coursekit-starplan` as "drop-in StarPlan ingestion for any NestJS app". Default config targets HFU but every URL/regex is configurable.
- Example app in `CourseKit/examples/starplan-server/` demonstrates a generic deployment.

---

## Critical Files Reference

### CourseKit (most-changed)
- `CourseKit/packages/backend/src/errors/` (new, Phase 0.3)
- `CourseKit/packages/starplan/` (new package, Phase 2)
- `CourseKit/packages/starplan-nestjs/` (new package, Phase 3)
- `CourseKit/biome.json` (new, Phase 0.2)
- `CourseKit/.github/workflows/publish.yml` (Phase 0.1)

### api/
- `api/prisma/schema.prisma` (Phases 4.1, 4.4, 9.4)
- `api/src/coursekit/coursekit.module.ts` (Phase 5.1)
- `api/src/starplan-sync/` (new, Phase 5.2)
- `api/src/starplan-developer/` (new, Phase 4.2)
- `api/src/starplan-notifications/` (new, Phase 4.4)
- `api/src/me-timetable/` (renamed from `api/src/splan/`, Phase 6.5)
- Removed: `api/src/splan/starplan-scraper.service.ts`, `starplan-ical-parser.ts`, `starplan-ical-cache.service.ts` (Phase 5.3)

### website/
- `website/app/me/timetable/page.tsx` (rewritten, Phase 6.2)
- `website/app/me/courses/page.tsx` (rewritten, Phase 6.2)
- `website/app/me/calendar/page.tsx` (new, Phase 6.2)
- `website/app/me/changes/page.tsx` (new, Phase 6.2)
- `website/components/timetable/*` (deleted, Phase 6.3)
- `website/app/providers.tsx` (CourseKitProvider added, Phase 6.1)
- `website/package.json` (deps added, Phase 6.1)

### better-splan/
- `better-splan/app/timetable/`, `/settings/`, `/calendar/`, `/admin/` (deleted, Phase 7.1)
- `better-splan/lib/api.ts` (deleted, Phase 7.3)
- `better-splan/lib/splan-api.ts` (rewritten to `api.hfu.digital/v1/starplan/*`, Phase 7.3)

### Infra
- DNS / load-balancer rules (Phase 8.2)
- `splan-api/` archived (Phase 8.3)

---

## End-to-End Verification

After Phase 9 ship:

1. **Open-source flow:** clone CourseKit, follow `docs/starplan.md`, run `examples/starplan-server/` against a non-HFU StarPlan URL → endpoints return that institution's data.
2. **Developer flow:** register at `https://api.hfu.digital/v1/starplan/developers/register`, receive key, hit `/v1/starplan/programs` with `X-API-Key` → same shape as old splan-api.
3. **User flow:** log into `https://hfu.digital/me/timetable`, see weekly grid; go to `/me/courses`, change semester, add an additional course from another semester, mark a course as hidden; go to `/me/calendar`, copy iCal URL into Google Calendar, see entries appear; trigger an admin StarPlan resync → `/me/changes` shows what moved; receive Discord DM if subscribed.
4. **Public browse:** visit `https://better-splan.hfu.digital/programs` (no login), see programs; navigate to a semester, see same `<TimetableGrid />` from CourseKit; no Discord login button anywhere.
5. **Retired:** `https://splan.dev.hfu.digital/*` returns 301 to `api.hfu.digital/v1/starplan/*`.

---

## Out-of-scope (intentionally deferred)

- **CourseKit conflict-detection REST endpoints** — `ConflictService` stays library-only this round; surfacing it via an admin REST endpoint can land in a follow-up.
- **Mobile app integration** — `mobile/` continues using whatever it uses today; a follow-up project adopts `coursekit-react-native` (does not exist yet).
- **Multi-tenant CourseKit hosting** — the StarPlan adapter is configurable per-instance, but multi-tenant hosting (one CourseKit serving many institutions concurrently) is not in scope.
- **Authentication-mode rework** — Better-Auth keeps its current Discord/SAML/passkey/2FA setup. Re-verification cadence (the 4-month HFU SSO) is unchanged.
