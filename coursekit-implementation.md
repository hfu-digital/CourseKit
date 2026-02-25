# CourseKit — Claude Code Implementation Plan

> **What this is:** A step-by-step execution plan for Claude Code to scaffold and build the CourseKit timetable library. It adapts the generic Kit Library Scaffold skill to CourseKit's specific domain, architectural decisions, and build requirements.
>
> **How to use:** Execute phases sequentially. Each phase lists exact files to create, their contents, and validation steps. Do NOT skip ahead — later phases depend on earlier ones compiling cleanly.

---

## Pre-Flight: Resolved Decisions

These are locked. Do not re-ask the user about them.

| Decision | Value |
|----------|-------|
| npm scope | `@coursekit` |
| Backend package | `@hfu.digital/coursekit-nestjs` |
| Frontend package | `@hfu.digital/coursekit-react` |
| Monorepo name | `coursekit` |
| Runtime | **Bun-only** (no Node/CommonJS output) |
| Build: JS output | `bun build --target=bun` |
| Build: declarations | `tsc --emitDeclarationOnly` |
| Recurrence | RRULE (RFC 5545, full spec) via `rrule` (bundled dependency) |
| Storage interfaces | Split per entity (abstract classes) |
| Event emitter | `@nestjs/event-emitter` (peerDependency) |
| Validation | `class-validator` + `class-transformer` (peerDependencies) |
| Prisma | Structural typing only — **NEVER import `@prisma/client`** |

---

## Phase 0 — Scaffold Monorepo Shell

**Goal:** Empty monorepo that runs `bun install` and `turbo build` without errors.

### 0.1 Create directory structure

```
/coursekit
├── package.json
├── turbo.json
├── tsconfig.base.json
├── bunfig.toml
├── .gitignore
├── LICENSE                        # MIT
├── README.md                      # Stub — filled in Phase 7
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts           # empty barrel: export {}
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           └── index.ts           # empty barrel: export {}
├── examples/                      # empty — populated in Tier 2
│   └── .gitkeep
└── .github/
    └── workflows/
        └── publish.yml
```

### 0.2 Root `package.json`

```json
{
  "name": "coursekit",
  "private": true,
  "workspaces": ["packages/*", "examples/*"],
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  }
}
```

### 0.3 `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

> **Note:** Turborepo v2 uses `"tasks"` not `"pipeline"`. Use `"tasks"`.

### 0.4 `tsconfig.base.json` (Bun-native)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true
  }
}
```

> **Differs from generic Kit skill:** No `"module": "commonjs"`, no `"outDir"/"rootDir"` at base level. Bun-only means ESNext modules throughout. Each package's tsconfig sets its own `outDir`/`rootDir`.

### 0.5 `bunfig.toml`

```toml
[install]
peer = true

[install.lockfile]
save = true
```

### 0.6 Backend `packages/backend/package.json`

```json
{
  "name": "@hfu.digital/coursekit-nestjs",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./testing": {
      "import": "./dist/testing/index.js",
      "types": "./dist/testing/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "bun build src/index.ts src/testing/index.ts --outdir dist --target bun --splitting --format esm",
    "build:types": "tsc --emitDeclarationOnly --outDir dist",
    "dev": "bun run build --watch",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "prepublishOnly": "bun run build"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0 || ^11.0.0",
    "@nestjs/core": "^10.0.0 || ^11.0.0",
    "@nestjs/event-emitter": "^2.0.0 || ^3.0.0",
    "rxjs": "^7.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  },
  "dependencies": {
    "rrule": "^2.8.1"
  },
  "devDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/event-emitter": "^3.0.0",
    "@nestjs/testing": "^11.0.0",
    "rxjs": "^7.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "reflect-metadata": "^0.2.0",
    "typescript": "^5.7.0",
    "@types/bun": "latest"
  }
}
```

> **Key adaptations from generic skill:**
> - `rrule` is a direct `dependency` (bundled), not a peer — simplifies consumer DX.
> - `@nestjs/event-emitter` added as peerDependency.
> - `class-validator` + `class-transformer` as peers for DTO validation.
> - Build uses `bun build` for JS, `tsc --emitDeclarationOnly` for types.
> - Separate `./testing` export path for test utilities (Tier 2).
> - `"type": "module"` — Bun-only, ESM throughout.

### 0.7 Backend `packages/backend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

> NestJS decorators require `experimentalDecorators` + `emitDecoratorMetadata`.

### 0.8 Frontend `packages/frontend/package.json`

```json
{
  "name": "@hfu.digital/coursekit-react",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.es.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "bunx vite build",
    "dev": "bunx vite build --watch",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "bun run build"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@types/react": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 0.9 Frontend `packages/frontend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### 0.10 Frontend `packages/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CourseKitReact',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'es.' : ''}js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM' } },
    },
  },
});
```

### 0.11 `.github/workflows/publish.yml`

```yaml
name: Publish Packages
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bunx turbo build
      - run: bunx turbo test
      - name: Publish Backend
        working-directory: packages/backend
        run: bun publish --access public
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Publish Frontend
        working-directory: packages/frontend
        run: bun publish --access public
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 0.12 `.gitignore`

```
node_modules/
dist/
.turbo/
bun.lockb
*.tsbuildinfo
```

### 0.13 Validation

```bash
cd coursekit
bun install
bun run typecheck   # should pass (empty barrels)
bun run build       # should produce dist/ in both packages
```

---

## Phase 1 — Types & Interfaces Foundation

**Goal:** Define all entity types, domain event payloads, and storage interface contracts. No implementation yet — just the shapes.

### 1.1 Create `packages/backend/src/interfaces/types.ts`

This is the single source of truth for all entity shapes. Every type that appears in the Prisma schema reference gets a TypeScript equivalent here.

```typescript
// ALL entity types live here. Prisma adapters map to these shapes.
// NEVER import @prisma/client — these are structural types.

// ─── Core Event ──────────────────────────────────────────────
export interface TimetableEvent {
  id: string;
  title: string;
  startTime: Date;
  durationMin: number;
  recurrenceRule: string | null;   // RFC 5545 RRULE string
  metadata: Record<string, unknown> | null;
  courseId: string | null;
  roomId: string | null;
  periodId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventException {
  id: string;
  eventId: string;
  originalDate: Date;              // which occurrence this overrides
  type: 'cancelled' | 'modified' | 'added';
  newStartTime: Date | null;
  newDurationMin: number | null;
  newRoomId: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Join Tables ─────────────────────────────────────────────
export interface EventInstructor {
  id: string;
  eventId: string;
  instructorId: string;
  role: string;                    // "primary" | "ta" | "co-lecturer"
}

export interface EventGroup {
  id: string;
  eventId: string;
  groupId: string;
}

// ─── Entities ────────────────────────────────────────────────
export interface Instructor {
  id: string;
  name: string;
  email: string | null;
  tags: Record<string, unknown> | null;
}

export interface Room {
  id: string;
  name: string;
  building: string | null;
  campus: string | null;
  capacity: number;
  tags: Record<string, unknown> | null;
}

export interface Group {
  id: string;
  name: string;
  type: 'fixed' | 'enrollment';
  maxCapacity: number | null;
}

export interface Student {
  id: string;
  name: string;
  email: string | null;
}

export interface StudentGroup {
  id: string;
  studentId: string;
  groupId: string;
}

export interface Course {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Availability ────────────────────────────────────────────
export type AvailabilityEntityType = 'instructor' | 'room';
export type AvailabilityType = 'available' | 'blocked' | 'preferred';
export type AvailabilityHardness = 'hard' | 'soft';

export interface Availability {
  id: string;
  entityType: AvailabilityEntityType;
  entityId: string;
  dayOfWeek: number | null;        // 0=Mon, 6=Sun
  specificDate: Date | null;
  startTime: Date;
  endTime: Date;
  type: AvailabilityType;
  hardness: AvailabilityHardness;
  priority: number;
  recurrenceRule: string | null;
}

// ─── Academic Periods ────────────────────────────────────────
export type PeriodType = 'semester' | 'holiday' | 'exam' | 'break';

export interface AcademicPeriod {
  id: string;
  name: string;
  type: PeriodType;
  startDate: Date;
  endDate: Date;
  parentId: string | null;
}

// ─── Location Distance ──────────────────────────────────────
export interface LocationDistance {
  id: string;
  fromCampus: string;
  toCampus: string;
  travelMinutes: number;
}

// ─── Materialized Occurrence ────────────────────────────────
// Result of expanding a recurring event for a date range.
// NOT stored — computed at query time.
export interface MaterializedOccurrence {
  eventId: string;
  occurrenceDate: Date;
  startTime: Date;
  durationMin: number;
  roomId: string | null;
  metadata: Record<string, unknown> | null;
  isException: boolean;
  exceptionType: EventException['type'] | null;
  originalEvent: TimetableEvent;
}

// ─── Query/Filter Types ─────────────────────────────────────
export interface DateRange {
  start: Date;
  end: Date;
}

export interface ScheduleQuery {
  dateRange: DateRange;
  instructorIds?: string[];
  roomIds?: string[];
  groupIds?: string[];
  courseIds?: string[];
  periodId?: string;
  tags?: Record<string, unknown>;
}

export interface FreeSlotQuery {
  dateRange: DateRange;
  durationMin: number;
  entityIds: Array<{ type: 'instructor' | 'room' | 'group'; id: string }>;
}

export interface FreeSlot {
  start: Date;
  end: Date;
  durationMin: number;
}

// ─── Conflict Types ─────────────────────────────────────────
export type ConflictSeverity = 'error' | 'warning';

export interface Conflict {
  id: string;
  type: string;                    // e.g. "instructor-double-book", "room-overlap"
  severity: ConflictSeverity;
  message: string;
  involvedEventIds: string[];
  involvedEntityIds: string[];
  metadata: Record<string, unknown>;
}

export interface ConflictCheckResult {
  hasErrors: boolean;
  hasWarnings: boolean;
  conflicts: Conflict[];
}

// ─── Validation Error ───────────────────────────────────────
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

### 1.2 Create storage interfaces (split per entity)

Each storage interface is an **abstract class** (not a TS interface) so NestJS DI can use it as an injection token.

Create one file per entity storage:

**`packages/backend/src/interfaces/event-storage.interface.ts`**

```typescript
import type {
  TimetableEvent, EventException, EventInstructor, EventGroup,
  ScheduleQuery, MaterializedOccurrence, DateRange,
} from './types.js';

export abstract class TimetableEventStorage {
  abstract create(data: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<TimetableEvent>;
  abstract findById(id: string): Promise<TimetableEvent | null>;
  abstract findByQuery(query: ScheduleQuery): Promise<TimetableEvent[]>;
  abstract update(id: string, data: Partial<TimetableEvent>, expectedVersion?: number): Promise<TimetableEvent>;
  abstract delete(id: string): Promise<void>;

  // Exception management
  abstract createException(data: Omit<EventException, 'id'>): Promise<EventException>;
  abstract findExceptions(eventId: string): Promise<EventException[]>;
  abstract deleteException(id: string): Promise<void>;

  // Instructor/Group associations
  abstract addInstructor(data: Omit<EventInstructor, 'id'>): Promise<EventInstructor>;
  abstract removeInstructor(eventId: string, instructorId: string): Promise<void>;
  abstract findInstructors(eventId: string): Promise<EventInstructor[]>;

  abstract addGroup(data: Omit<EventGroup, 'id'>): Promise<EventGroup>;
  abstract removeGroup(eventId: string, groupId: string): Promise<void>;
  abstract findGroups(eventId: string): Promise<EventGroup[]>;
}
```

**`packages/backend/src/interfaces/room-storage.interface.ts`**

```typescript
import type { Room } from './types.js';

export abstract class RoomStorage {
  abstract create(data: Omit<Room, 'id'>): Promise<Room>;
  abstract findById(id: string): Promise<Room | null>;
  abstract findAll(filters?: { building?: string; campus?: string; minCapacity?: number; tags?: Record<string, unknown> }): Promise<Room[]>;
  abstract update(id: string, data: Partial<Room>): Promise<Room>;
  abstract delete(id: string): Promise<void>;
}
```

**`packages/backend/src/interfaces/instructor-storage.interface.ts`**

```typescript
import type { Instructor } from './types.js';

export abstract class InstructorStorage {
  abstract create(data: Omit<Instructor, 'id'>): Promise<Instructor>;
  abstract findById(id: string): Promise<Instructor | null>;
  abstract findAll(filters?: { tags?: Record<string, unknown> }): Promise<Instructor[]>;
  abstract update(id: string, data: Partial<Instructor>): Promise<Instructor>;
  abstract delete(id: string): Promise<void>;
}
```

**`packages/backend/src/interfaces/group-storage.interface.ts`**

```typescript
import type { Group, StudentGroup } from './types.js';

export abstract class GroupStorage {
  abstract create(data: Omit<Group, 'id'>): Promise<Group>;
  abstract findById(id: string): Promise<Group | null>;
  abstract findAll(filters?: { type?: Group['type'] }): Promise<Group[]>;
  abstract update(id: string, data: Partial<Group>): Promise<Group>;
  abstract delete(id: string): Promise<void>;

  abstract addStudent(data: Omit<StudentGroup, 'id'>): Promise<StudentGroup>;
  abstract removeStudent(studentId: string, groupId: string): Promise<void>;
  abstract findStudents(groupId: string): Promise<StudentGroup[]>;
  abstract findGroupsForStudent(studentId: string): Promise<StudentGroup[]>;
}
```

**`packages/backend/src/interfaces/availability-storage.interface.ts`**

```typescript
import type { Availability, AvailabilityEntityType, DateRange } from './types.js';

export abstract class AvailabilityStorage {
  abstract create(data: Omit<Availability, 'id'>): Promise<Availability>;
  abstract findById(id: string): Promise<Availability | null>;
  abstract findByEntity(entityType: AvailabilityEntityType, entityId: string): Promise<Availability[]>;
  abstract findByEntityInRange(entityType: AvailabilityEntityType, entityId: string, dateRange: DateRange): Promise<Availability[]>;
  abstract update(id: string, data: Partial<Availability>): Promise<Availability>;
  abstract delete(id: string): Promise<void>;
}
```

**`packages/backend/src/interfaces/period-storage.interface.ts`**

```typescript
import type { AcademicPeriod, DateRange } from './types.js';

export abstract class AcademicPeriodStorage {
  abstract create(data: Omit<AcademicPeriod, 'id'>): Promise<AcademicPeriod>;
  abstract findById(id: string): Promise<AcademicPeriod | null>;
  abstract findAll(filters?: { type?: AcademicPeriod['type']; parentId?: string }): Promise<AcademicPeriod[]>;
  abstract findOverlapping(dateRange: DateRange): Promise<AcademicPeriod[]>;
  abstract findChildren(parentId: string): Promise<AcademicPeriod[]>;
  abstract update(id: string, data: Partial<AcademicPeriod>): Promise<AcademicPeriod>;
  abstract delete(id: string): Promise<void>;
}
```

**`packages/backend/src/interfaces/course-storage.interface.ts`**

```typescript
import type { Course } from './types.js';

export abstract class CourseStorage {
  abstract create(data: Omit<Course, 'id'>): Promise<Course>;
  abstract findById(id: string): Promise<Course | null>;
  abstract findByCode(code: string): Promise<Course | null>;
  abstract findAll(filters?: { parentId?: string }): Promise<Course[]>;
  abstract findChildren(parentId: string): Promise<Course[]>;
  abstract update(id: string, data: Partial<Course>): Promise<Course>;
  abstract delete(id: string): Promise<void>;
}
```

**`packages/backend/src/interfaces/location-distance-storage.interface.ts`**

```typescript
import type { LocationDistance } from './types.js';

export abstract class LocationDistanceStorage {
  abstract create(data: Omit<LocationDistance, 'id'>): Promise<LocationDistance>;
  abstract findByCampuses(fromCampus: string, toCampus: string): Promise<LocationDistance | null>;
  abstract findAll(): Promise<LocationDistance[]>;
  abstract update(id: string, data: Partial<LocationDistance>): Promise<LocationDistance>;
  abstract delete(id: string): Promise<void>;
}
```

### 1.3 Create `packages/backend/src/interfaces/constraint.interface.ts`

The pluggable conflict detection contract:

```typescript
import type { TimetableEvent, MaterializedOccurrence, Conflict, DateRange } from './types.js';

/**
 * A constraint rule that the conflict detection engine evaluates.
 * Consumers can register custom constraints alongside built-ins.
 */
export abstract class ScheduleConstraint {
  /** Unique identifier for this constraint type, e.g. "instructor-overlap" */
  abstract readonly type: string;

  /** Human-readable description */
  abstract readonly description: string;

  /**
   * Evaluate whether a set of occurrences violates this constraint.
   * Returns an empty array if no violations found.
   */
  abstract evaluate(
    occurrences: MaterializedOccurrence[],
    context: ConstraintContext,
  ): Promise<Conflict[]>;
}

export interface ConstraintContext {
  dateRange: DateRange;
  allEvents: TimetableEvent[];
  /** Lookup helpers injected by the conflict service */
  getInstructorsForEvent: (eventId: string) => Promise<string[]>;
  getGroupsForEvent: (eventId: string) => Promise<string[]>;
}
```

### 1.4 Create `packages/backend/src/interfaces/domain-events.interface.ts`

Typed event payloads for the internal event emitter:

```typescript
import type {
  TimetableEvent, EventException, Availability,
  Conflict, ConflictCheckResult,
} from './types.js';

// ─── Event Names (constants for type safety) ────────────────
export const DOMAIN_EVENTS = {
  EVENT_CREATED: 'coursekit.event.created',
  EVENT_UPDATED: 'coursekit.event.updated',
  EVENT_DELETED: 'coursekit.event.deleted',
  EXCEPTION_CREATED: 'coursekit.exception.created',
  EXCEPTION_DELETED: 'coursekit.exception.deleted',
  CONFLICT_DETECTED: 'coursekit.conflict.detected',
  AVAILABILITY_CREATED: 'coursekit.availability.created',
  AVAILABILITY_UPDATED: 'coursekit.availability.updated',
  AVAILABILITY_DELETED: 'coursekit.availability.deleted',
} as const;

// ─── Payload Types ───────────────────────────────────────────
export interface EventCreatedPayload {
  event: TimetableEvent;
}

export interface EventUpdatedPayload {
  previous: TimetableEvent;
  current: TimetableEvent;
  changedFields: string[];
}

export interface EventDeletedPayload {
  event: TimetableEvent;
}

export interface ExceptionCreatedPayload {
  exception: EventException;
  parentEvent: TimetableEvent;
}

export interface ExceptionDeletedPayload {
  exception: EventException;
  parentEvent: TimetableEvent;
}

export interface ConflictDetectedPayload {
  result: ConflictCheckResult;
  triggeringEventId: string;
}

export interface AvailabilityCreatedPayload {
  availability: Availability;
}

export interface AvailabilityUpdatedPayload {
  previous: Availability;
  current: Availability;
}

export interface AvailabilityDeletedPayload {
  availability: Availability;
}

// ─── Union Map (for typed subscribers) ──────────────────────
export interface DomainEventMap {
  [DOMAIN_EVENTS.EVENT_CREATED]: EventCreatedPayload;
  [DOMAIN_EVENTS.EVENT_UPDATED]: EventUpdatedPayload;
  [DOMAIN_EVENTS.EVENT_DELETED]: EventDeletedPayload;
  [DOMAIN_EVENTS.EXCEPTION_CREATED]: ExceptionCreatedPayload;
  [DOMAIN_EVENTS.EXCEPTION_DELETED]: ExceptionDeletedPayload;
  [DOMAIN_EVENTS.CONFLICT_DETECTED]: ConflictDetectedPayload;
  [DOMAIN_EVENTS.AVAILABILITY_CREATED]: AvailabilityCreatedPayload;
  [DOMAIN_EVENTS.AVAILABILITY_UPDATED]: AvailabilityUpdatedPayload;
  [DOMAIN_EVENTS.AVAILABILITY_DELETED]: AvailabilityDeletedPayload;
}
```

### 1.5 Validation

```bash
cd coursekit
bun run typecheck  # All interfaces should compile with zero errors
```

---

## Phase 2 — Domain Services (Tier 1 Logic)

**Goal:** Implement the 6 core domain services. Each service depends only on storage interfaces and the event emitter — never on concrete adapters.

### Build order (dependencies flow downward):

```
RecurrenceService      (standalone — wraps rrule.js)
     ↓
TimeService            (uses RecurrenceService)
     ↓
EntityService          (CRUD orchestration, uses storage interfaces)
     ↓
AvailabilityService    (uses AvailabilityStorage, RecurrenceService)
     ↓
ConflictService        (uses TimeService, AvailabilityService, ScheduleConstraint[])
     ↓
QueryService           (uses all storage interfaces, RecurrenceService, ConflictService)
```

### 2.1 `packages/backend/src/domain/recurrence.service.ts`

Core responsibility: wrap `rrule.js`, provide materialization, handle EXDATE/RDATE/exceptions.

```typescript
import { Injectable } from '@nestjs/common';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { TimetableEvent, EventException, MaterializedOccurrence, DateRange } from '../interfaces/types.js';

@Injectable()
export class RecurrenceService {
  /**
   * Parse an RRULE string into an RRule instance.
   * Throws if the string is invalid.
   */
  parseRule(rruleString: string, dtstart: Date): RRule { /* ... */ }

  /**
   * Materialize a recurring event into concrete occurrences for a date range.
   * Applies exceptions (cancellations, modifications, additions).
   */
  materialize(
    event: TimetableEvent,
    exceptions: EventException[],
    dateRange: DateRange,
  ): MaterializedOccurrence[] { /* ... */ }

  /**
   * For a non-recurring event, return a single occurrence if it falls in the range.
   */
  materializeSingle(
    event: TimetableEvent,
    dateRange: DateRange,
  ): MaterializedOccurrence | null { /* ... */ }

  /**
   * Validate an RRULE string. Returns null if valid, error message if invalid.
   */
  validateRule(rruleString: string): string | null { /* ... */ }
}
```

**Implementation notes:**
- Use `RRuleSet` to combine RRULE + EXDATE + RDATE.
- For exceptions of type `modified`, clone the parent occurrence and apply overrides.
- For exceptions of type `added`, inject an extra occurrence at `originalDate`.
- For exceptions of type `cancelled`, add to EXDATE set.
- All dates internally UTC. Use `RRule.prototype.between(start, end, true)` for materialization.

### 2.2 `packages/backend/src/domain/time.service.ts`

Utility service for time operations used across the domain.

```typescript
@Injectable()
export class TimeService {
  /** Check if two time intervals overlap */
  overlaps(aStart: Date, aDurationMin: number, bStart: Date, bDurationMin: number): boolean { /* ... */ }

  /** Compute end time from start + duration */
  endTime(start: Date, durationMin: number): Date { /* ... */ }

  /** Check if a date falls within a range */
  isInRange(date: Date, range: DateRange): boolean { /* ... */ }

  /** Compute gap in minutes between two consecutive events */
  gapMinutes(endOfFirst: Date, startOfSecond: Date): number { /* ... */ }
}
```

### 2.3 `packages/backend/src/domain/availability.service.ts`

```typescript
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly storage: AvailabilityStorage,
    private readonly recurrence: RecurrenceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: Omit<Availability, 'id'>): Promise<Availability> { /* ... emit event ... */ }
  async update(id: string, data: Partial<Availability>): Promise<Availability> { /* ... emit event ... */ }
  async delete(id: string): Promise<void> { /* ... emit event ... */ }

  /**
   * Check if an entity is available at a specific time.
   * Expands recurring availability rules for the given date.
   */
  async isAvailable(
    entityType: AvailabilityEntityType,
    entityId: string,
    start: Date,
    durationMin: number,
  ): Promise<{ available: boolean; conflicts: Availability[] }> { /* ... */ }

  /**
   * Find free slots for an entity within a date range.
   */
  async findFreeSlots(
    entityType: AvailabilityEntityType,
    entityId: string,
    dateRange: DateRange,
    minDurationMin: number,
  ): Promise<FreeSlot[]> { /* ... */ }
}
```

### 2.4 `packages/backend/src/domain/conflict.service.ts`

```typescript
@Injectable()
export class ConflictService {
  constructor(
    private readonly time: TimeService,
    private readonly availability: AvailabilityService,
    private readonly eventStorage: TimetableEventStorage,
    private readonly recurrence: RecurrenceService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('SCHEDULE_CONSTRAINTS') private readonly constraints: ScheduleConstraint[],
  ) {}

  /**
   * Check a single event (or proposed event) against all registered constraints.
   * Materializes recurring events in the relevant date range.
   */
  async check(event: TimetableEvent, dateRange: DateRange): Promise<ConflictCheckResult> { /* ... */ }

  /**
   * Dry-run: check what conflicts a mutation would create without applying it.
   */
  async dryRun(proposedEvent: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt' | 'version'>, dateRange: DateRange): Promise<ConflictCheckResult> { /* ... */ }
}
```

### 2.5 `packages/backend/src/domain/query.service.ts`

```typescript
@Injectable()
export class QueryService {
  constructor(
    private readonly eventStorage: TimetableEventStorage,
    private readonly recurrence: RecurrenceService,
    private readonly time: TimeService,
  ) {}

  /**
   * Get all materialized occurrences matching a query.
   * Expands recurring events, applies exceptions, filters by entities.
   */
  async getSchedule(query: ScheduleQuery): Promise<MaterializedOccurrence[]> { /* ... */ }

  /**
   * Find time slots where ALL specified entities are free.
   */
  async findFreeSlots(query: FreeSlotQuery): Promise<FreeSlot[]> { /* ... */ }

  /**
   * Get schedule for a specific entity (convenience wrapper).
   */
  async getEntitySchedule(
    entityType: 'instructor' | 'room' | 'group',
    entityId: string,
    dateRange: DateRange,
  ): Promise<MaterializedOccurrence[]> { /* ... */ }
}
```

### 2.6 Built-in constraints: `packages/backend/src/constraints/`

**`overlap.constraint.ts`** — Detects instructor and room double-bookings.

```typescript
@Injectable()
export class OverlapConstraint extends ScheduleConstraint {
  readonly type = 'overlap';
  readonly description = 'Detects time overlaps for instructors and rooms';

  async evaluate(occurrences: MaterializedOccurrence[], context: ConstraintContext): Promise<Conflict[]> {
    // Group occurrences by instructor, check pairwise overlaps
    // Group occurrences by room, check pairwise overlaps
    // Return conflicts for each violation
  }
}
```

**`capacity.constraint.ts`** — Checks room capacity against group size.

**`availability.constraint.ts`** — Checks events against entity availability rules.

### 2.7 DTO validation: `packages/backend/src/dto/`

Use `class-validator` decorators. One DTO per major operation:

- `create-event.dto.ts` — validates title, startTime, durationMin > 0, optional RRULE string
- `update-event.dto.ts` — partial version of create
- `create-exception.dto.ts` — validates exception type, originalDate
- `create-availability.dto.ts` — validates entity references, time ranges, hardness
- `query-filter.dto.ts` — validates date ranges, entity ID arrays
- `create-entity.dto.ts` — validates room/instructor/group/course creation

Each DTO should have a static `validate(data: unknown): ValidationResult` method that doesn't require class instantiation (so consumers without class-transformer can still validate).

### 2.8 Validation

```bash
bun run typecheck  # All services compile
bun test           # Unit tests for RecurrenceService (at minimum)
```

---

## Phase 3 — Prisma Adapters

**Goal:** One Prisma adapter class per storage interface. All use structural typing — define `PrismaDelegate` shapes locally.

### 3.1 Structural typing pattern

Each adapter defines the Prisma delegate shape it expects. Example for events:

```typescript
// packages/backend/src/adapters/prisma-event.adapter.ts

type PrismaEventDelegate = {
  create: (args: { data: any }) => Promise<any>;
  findUnique: (args: { where: any; include?: any }) => Promise<any>;
  findMany: (args: { where?: any; include?: any }) => Promise<any[]>;
  update: (args: { where: any; data: any }) => Promise<any>;
  delete: (args: { where: any }) => Promise<any>;
};

type PrismaExceptionDelegate = {
  create: (args: { data: any }) => Promise<any>;
  findMany: (args: { where?: any }) => Promise<any[]>;
  delete: (args: { where: any }) => Promise<any>;
};

// ... similar for EventInstructor, EventGroup delegates

export class PrismaTimetableEventAdapter extends TimetableEventStorage {
  constructor(
    private readonly eventDelegate: PrismaEventDelegate,
    private readonly exceptionDelegate: PrismaExceptionDelegate,
    private readonly instructorDelegate: PrismaEventInstructorDelegate,
    private readonly groupDelegate: PrismaEventGroupDelegate,
  ) { super(); }

  // Implement all abstract methods
}
```

### 3.2 Create one adapter per entity

| File | Class | Implements |
|------|-------|-----------|
| `prisma-event.adapter.ts` | `PrismaTimetableEventAdapter` | `TimetableEventStorage` |
| `prisma-room.adapter.ts` | `PrismaRoomAdapter` | `RoomStorage` |
| `prisma-instructor.adapter.ts` | `PrismaInstructorAdapter` | `InstructorStorage` |
| `prisma-group.adapter.ts` | `PrismaGroupAdapter` | `GroupStorage` |
| `prisma-availability.adapter.ts` | `PrismaAvailabilityAdapter` | `AvailabilityStorage` |
| `prisma-period.adapter.ts` | `PrismaAcademicPeriodAdapter` | `AcademicPeriodStorage` |
| `prisma-course.adapter.ts` | `PrismaCourseAdapter` | `CourseStorage` |
| `prisma-location-distance.adapter.ts` | `PrismaLocationDistanceAdapter` | `LocationDistanceStorage` |

### 3.3 Consumer usage pattern (for README)

```typescript
// In the host app's module:
import { PrismaClient } from '@prisma/client';
import { CourseKitModule, PrismaTimetableEventAdapter, PrismaRoomAdapter /* ... */ } from '@hfu.digital/coursekit-nestjs';

const prisma = new PrismaClient();

@Module({
  imports: [
    CourseKitModule.register({
      eventStorage: new PrismaTimetableEventAdapter(
        prisma.timetableEvent,
        prisma.eventException,
        prisma.eventInstructor,
        prisma.eventGroup,
      ),
      roomStorage: new PrismaRoomAdapter(prisma.room),
      instructorStorage: new PrismaInstructorAdapter(prisma.instructor),
      // ... etc
    }),
  ],
})
export class AppModule {}
```

### 3.4 Validation

```bash
bun run typecheck  # Adapters compile against the abstract classes
```

---

## Phase 4 — NestJS DynamicModule

**Goal:** `CourseKitModule.register()` wires everything together.

### 4.1 `packages/backend/src/module.ts`

```typescript
import { DynamicModule, Module, type Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Storage interfaces
import { TimetableEventStorage } from './interfaces/event-storage.interface.js';
import { RoomStorage } from './interfaces/room-storage.interface.js';
import { InstructorStorage } from './interfaces/instructor-storage.interface.js';
import { GroupStorage } from './interfaces/group-storage.interface.js';
import { AvailabilityStorage } from './interfaces/availability-storage.interface.js';
import { AcademicPeriodStorage } from './interfaces/period-storage.interface.js';
import { CourseStorage } from './interfaces/course-storage.interface.js';
import { LocationDistanceStorage } from './interfaces/location-distance-storage.interface.js';
import { ScheduleConstraint } from './interfaces/constraint.interface.js';

// Domain services
import { RecurrenceService } from './domain/recurrence.service.js';
import { TimeService } from './domain/time.service.js';
import { AvailabilityService } from './domain/availability.service.js';
import { ConflictService } from './domain/conflict.service.js';
import { QueryService } from './domain/query.service.js';

// Built-in constraints
import { OverlapConstraint } from './constraints/overlap.constraint.js';
import { CapacityConstraint } from './constraints/capacity.constraint.js';
import { AvailabilityConstraint } from './constraints/availability.constraint.js';

export interface CourseKitModuleOptions {
  eventStorage: TimetableEventStorage;
  roomStorage: RoomStorage;
  instructorStorage: InstructorStorage;
  groupStorage: GroupStorage;
  availabilityStorage: AvailabilityStorage;
  periodStorage: AcademicPeriodStorage;
  courseStorage: CourseStorage;
  locationDistanceStorage?: LocationDistanceStorage;
  /** Additional custom constraints beyond the built-ins */
  constraints?: ScheduleConstraint[];
  /** Set false to disable built-in constraints (default: true) */
  enableBuiltInConstraints?: boolean;
}

@Module({})
export class CourseKitModule {
  static register(options: CourseKitModuleOptions): DynamicModule {
    const builtInConstraints: ScheduleConstraint[] =
      options.enableBuiltInConstraints !== false
        ? [new OverlapConstraint(), new CapacityConstraint(), new AvailabilityConstraint()]
        : [];

    const allConstraints = [...builtInConstraints, ...(options.constraints ?? [])];

    const storageProviders: Provider[] = [
      { provide: TimetableEventStorage, useValue: options.eventStorage },
      { provide: RoomStorage, useValue: options.roomStorage },
      { provide: InstructorStorage, useValue: options.instructorStorage },
      { provide: GroupStorage, useValue: options.groupStorage },
      { provide: AvailabilityStorage, useValue: options.availabilityStorage },
      { provide: AcademicPeriodStorage, useValue: options.periodStorage },
      { provide: CourseStorage, useValue: options.courseStorage },
      { provide: 'SCHEDULE_CONSTRAINTS', useValue: allConstraints },
    ];

    if (options.locationDistanceStorage) {
      storageProviders.push({
        provide: LocationDistanceStorage,
        useValue: options.locationDistanceStorage,
      });
    }

    return {
      module: CourseKitModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ...storageProviders,
        RecurrenceService,
        TimeService,
        AvailabilityService,
        ConflictService,
        QueryService,
      ],
      exports: [
        RecurrenceService,
        TimeService,
        AvailabilityService,
        ConflictService,
        QueryService,
        TimetableEventStorage,
        RoomStorage,
        InstructorStorage,
        GroupStorage,
        AvailabilityStorage,
        AcademicPeriodStorage,
        CourseStorage,
      ],
    };
  }
}
```

### 4.2 Barrel export: `packages/backend/src/index.ts`

```typescript
// Module
export { CourseKitModule, type CourseKitModuleOptions } from './module.js';

// Domain services
export { RecurrenceService } from './domain/recurrence.service.js';
export { TimeService } from './domain/time.service.js';
export { AvailabilityService } from './domain/availability.service.js';
export { ConflictService } from './domain/conflict.service.js';
export { QueryService } from './domain/query.service.js';

// Storage interfaces (for custom adapter authors)
export { TimetableEventStorage } from './interfaces/event-storage.interface.js';
export { RoomStorage } from './interfaces/room-storage.interface.js';
export { InstructorStorage } from './interfaces/instructor-storage.interface.js';
export { GroupStorage } from './interfaces/group-storage.interface.js';
export { AvailabilityStorage } from './interfaces/availability-storage.interface.js';
export { AcademicPeriodStorage } from './interfaces/period-storage.interface.js';
export { CourseStorage } from './interfaces/course-storage.interface.js';
export { LocationDistanceStorage } from './interfaces/location-distance-storage.interface.js';
export { ScheduleConstraint, type ConstraintContext } from './interfaces/constraint.interface.js';

// Prisma adapters
export { PrismaTimetableEventAdapter } from './adapters/prisma-event.adapter.js';
export { PrismaRoomAdapter } from './adapters/prisma-room.adapter.js';
export { PrismaInstructorAdapter } from './adapters/prisma-instructor.adapter.js';
export { PrismaGroupAdapter } from './adapters/prisma-group.adapter.js';
export { PrismaAvailabilityAdapter } from './adapters/prisma-availability.adapter.js';
export { PrismaAcademicPeriodAdapter } from './adapters/prisma-period.adapter.js';
export { PrismaCourseAdapter } from './adapters/prisma-course.adapter.js';
export { PrismaLocationDistanceAdapter } from './adapters/prisma-location-distance.adapter.js';

// Types (everything consumers need for type safety)
export type * from './interfaces/types.js';

// Domain events (for typed subscribers)
export { DOMAIN_EVENTS } from './interfaces/domain-events.interface.js';
export type * from './interfaces/domain-events.interface.js';

// DTOs
export { CreateEventDto } from './dto/create-event.dto.js';
export { UpdateEventDto } from './dto/update-event.dto.js';
export { CreateExceptionDto } from './dto/create-exception.dto.js';
export { CreateAvailabilityDto } from './dto/create-availability.dto.js';
export { QueryFilterDto } from './dto/query-filter.dto.js';
```

### 4.3 Validation

```bash
bun run build      # Full build: JS + declarations
bun run typecheck  # No errors
```

---

## Phase 5 — Testing Utilities (Tier 2, but ship early)

**Goal:** Provide in-memory adapters + factories so consumers (and we) can test without a database.

### 5.1 Directory: `packages/backend/src/testing/`

| File | Purpose |
|------|---------|
| `memory-event-storage.adapter.ts` | `Map`-based `TimetableEventStorage` |
| `memory-room-storage.adapter.ts` | `Map`-based `RoomStorage` |
| `memory-instructor-storage.adapter.ts` | `Map`-based `InstructorStorage` |
| `memory-group-storage.adapter.ts` | `Map`-based `GroupStorage` |
| `memory-availability-storage.adapter.ts` | `Map`-based `AvailabilityStorage` |
| `memory-period-storage.adapter.ts` | `Map`-based `AcademicPeriodStorage` |
| `memory-course-storage.adapter.ts` | `Map`-based `CourseStorage` |
| `factories.ts` | `createTestEvent()`, `createTestRoom()`, etc. with sensible defaults + overrides |
| `fixtures.ts` | Pre-built scenarios: "simple school week", "university semester with conflicts" |
| `event-spy.ts` | Captures emitted domain events for assertions |
| `assertions.ts` | `expectNoConflicts()`, `expectConflict()` helpers |
| `index.ts` | Barrel export for the `./testing` subpath |

### 5.2 In-memory adapter pattern

Each in-memory adapter uses a `Map<string, Entity>` and generates `cuid()`-style IDs:

```typescript
export class InMemoryTimetableEventStorage extends TimetableEventStorage {
  private events = new Map<string, TimetableEvent>();
  private exceptions = new Map<string, EventException>();
  // ...

  async create(data) {
    const event = { ...data, id: crypto.randomUUID(), version: 0, createdAt: new Date(), updatedAt: new Date() };
    this.events.set(event.id, event);
    return event;
  }
  // ... implement all abstract methods
}
```

### 5.3 Barrel: `packages/backend/src/testing/index.ts`

```typescript
// In-memory adapters
export { InMemoryTimetableEventStorage } from './memory-event-storage.adapter.js';
export { InMemoryRoomStorage } from './memory-room-storage.adapter.js';
// ... all adapters

// Factories
export { createTestEvent, createTestRoom, createTestInstructor, /* ... */ } from './factories.js';

// Fixtures
export { simpleSchoolWeek, universitySemester, edgeCaseSchedule } from './fixtures.js';

// Test helpers
export { EventSpy } from './event-spy.js';
export { expectNoConflicts, expectConflict } from './assertions.js';
```

---

## Phase 6 — Frontend Package (Tier 2)

**Goal:** Ship `@hfu.digital/coursekit-react` with a provider, headless hooks, and minimal components.

### 6.1 `packages/frontend/src/context/CourseKitProvider.tsx`

```typescript
import { createContext, useContext, type ReactNode } from 'react';

export interface CourseKitConfig {
  apiUrl: string;
  /** Optional: custom fetch function for auth headers, etc. */
  fetch?: typeof globalThis.fetch;
}

const CourseKitContext = createContext<CourseKitConfig | null>(null);

export const useCourseKitConfig = () => {
  const ctx = useContext(CourseKitContext);
  if (!ctx) throw new Error('Wrap your app in <CourseKitProvider>');
  return ctx;
};

export const CourseKitProvider = ({
  apiUrl, fetch, children,
}: CourseKitConfig & { children: ReactNode }) => (
  <CourseKitContext.Provider value={{ apiUrl, fetch }}>
    {children}
  </CourseKitContext.Provider>
);
```

### 6.2 Hooks (implement in order)

| Hook | File | Description |
|------|------|-------------|
| `useTimetable` | `hooks/useTimetable.ts` | Fetch schedule for entity + date range |
| `useAvailability` | `hooks/useAvailability.ts` | Fetch free/busy for entity |
| `useConflictCheck` | `hooks/useConflictCheck.ts` | Real-time conflict preview for proposed event |
| `useMutation` | `hooks/useMutation.ts` | Create/update/delete events with optimistic updates |
| `useRoomSearch` | `hooks/useRoomSearch.ts` | Search rooms by capacity, equipment, availability |

All hooks use the `apiUrl` + `fetch` from `CourseKitProvider`. Use plain `fetch` — no tanstack-query dependency (consumers can wrap if they want).

### 6.3 Components (implement after hooks are stable)

| Component | File | Description |
|-----------|------|-------------|
| `TimetableGrid` | `components/TimetableGrid.tsx` | Week/day grid view, configurable time axis |
| `EventCard` | `components/EventCard.tsx` | Single event display, accepts `className` |
| `ConflictBadge` | `components/ConflictBadge.tsx` | Visual conflict indicator |
| `AvailabilityOverlay` | `components/AvailabilityOverlay.tsx` | Free/busy overlay on grid |

All components accept `className` prop. No hardcoded CSS framework. Ship minimal inline defaults.

### 6.4 Barrel: `packages/frontend/src/index.ts`

```typescript
export { CourseKitProvider, useCourseKitConfig, type CourseKitConfig } from './context/CourseKitProvider.js';
export { useTimetable } from './hooks/useTimetable.js';
export { useAvailability } from './hooks/useAvailability.js';
export { useConflictCheck } from './hooks/useConflictCheck.js';
export { useMutation } from './hooks/useMutation.js';
export { useRoomSearch } from './hooks/useRoomSearch.js';
export { TimetableGrid } from './components/TimetableGrid.js';
export { EventCard } from './components/EventCard.js';
export { ConflictBadge } from './components/ConflictBadge.js';
export { AvailabilityOverlay } from './components/AvailabilityOverlay.js';
```

---

## Phase 7 — README, Schema Reference, Docs

**Goal:** Complete the README with everything a consumer needs to integrate.

### 7.1 README sections (in order)

1. **Overview** — "A timetable engine for academic scheduling: recurring events, conflict detection, availability management, and a React frontend. Ships as `@hfu.digital/coursekit-nestjs` + `@hfu.digital/coursekit-react`."
2. **Prerequisites** — Bun ≥ 1.0, NestJS ≥ 10, React ≥ 18
3. **Installation** — `bun add @hfu.digital/coursekit-nestjs @hfu.digital/coursekit-react`
4. **Prisma Schema Reference** — The full schema from the feature plan (copy the `model` blocks verbatim)
5. **Backend Integration** — `CourseKitModule.register()` example with all Prisma adapters
6. **Frontend Integration** — `<CourseKitProvider>` setup + hook examples
7. **Custom Adapter Guide** — How to implement storage interfaces for TypeORM/Drizzle/Knex
8. **Built-in Constraints** — What ships out of the box, how to add custom ones
9. **RRULE Examples** — Common recurrence patterns for academic scheduling
10. **Testing** — How to use the `@hfu.digital/coursekit-nestjs/testing` subpath
11. **API Reference** — Key exports, service methods, types
12. **Development** — `bun install` → `bun run build` → `bun run dev`

---

## Phase 8 — Integration Validation

**Goal:** Verify the full library works end-to-end before publishing.

### 8.1 Write integration tests using the testing utilities

```typescript
// packages/backend/src/__tests__/integration.test.ts
import { Test } from '@nestjs/testing';
import { CourseKitModule } from '../module.js';
import {
  InMemoryTimetableEventStorage,
  InMemoryRoomStorage,
  // ... all in-memory adapters
  createTestEvent,
  createTestRoom,
} from '../testing/index.js';

describe('CourseKit Integration', () => {
  it('should detect instructor double-booking', async () => { /* ... */ });
  it('should materialize recurring events with exceptions', async () => { /* ... */ });
  it('should respect availability constraints', async () => { /* ... */ });
  it('should find free slots across multiple entities', async () => { /* ... */ });
  it('should emit domain events on mutations', async () => { /* ... */ });
});
```

### 8.2 Full validation checklist

```bash
bun install
bun run typecheck         # Zero errors in both packages
bun run build             # Produces dist/ with JS + .d.ts in both packages
bun test                  # All tests pass
ls packages/backend/dist  # Verify index.js, index.d.ts, testing/index.js, testing/index.d.ts exist
ls packages/frontend/dist # Verify index.js, index.es.js, index.d.ts exist
```

---

## Appendix A — File Checklist

Complete file listing for the `packages/backend/src/` directory at the end of Tier 1 + early Tier 2:

```
src/
├── index.ts                                    # Main barrel export
├── module.ts                                   # CourseKitModule.register()
├── domain/
│   ├── recurrence.service.ts                   # RRULE materialization
│   ├── time.service.ts                         # Time overlap utilities
│   ├── availability.service.ts                 # Availability CRUD + checks
│   ├── conflict.service.ts                     # Constraint evaluation engine
│   └── query.service.ts                        # Schedule queries + free slots
├── interfaces/
│   ├── types.ts                                # ALL entity types
│   ├── event-storage.interface.ts              # TimetableEventStorage
│   ├── room-storage.interface.ts               # RoomStorage
│   ├── instructor-storage.interface.ts         # InstructorStorage
│   ├── group-storage.interface.ts              # GroupStorage
│   ├── availability-storage.interface.ts       # AvailabilityStorage
│   ├── period-storage.interface.ts             # AcademicPeriodStorage
│   ├── course-storage.interface.ts             # CourseStorage
│   ├── location-distance-storage.interface.ts  # LocationDistanceStorage
│   ├── constraint.interface.ts                 # ScheduleConstraint contract
│   └── domain-events.interface.ts              # Typed event payloads
├── adapters/
│   ├── prisma-event.adapter.ts
│   ├── prisma-room.adapter.ts
│   ├── prisma-instructor.adapter.ts
│   ├── prisma-group.adapter.ts
│   ├── prisma-availability.adapter.ts
│   ├── prisma-period.adapter.ts
│   ├── prisma-course.adapter.ts
│   └── prisma-location-distance.adapter.ts
├── dto/
│   ├── create-event.dto.ts
│   ├── update-event.dto.ts
│   ├── create-exception.dto.ts
│   ├── create-availability.dto.ts
│   ├── create-entity.dto.ts
│   └── query-filter.dto.ts
├── constraints/
│   ├── overlap.constraint.ts
│   ├── capacity.constraint.ts
│   └── availability.constraint.ts
├── testing/
│   ├── index.ts
│   ├── memory-event-storage.adapter.ts
│   ├── memory-room-storage.adapter.ts
│   ├── memory-instructor-storage.adapter.ts
│   ├── memory-group-storage.adapter.ts
│   ├── memory-availability-storage.adapter.ts
│   ├── memory-period-storage.adapter.ts
│   ├── memory-course-storage.adapter.ts
│   ├── factories.ts
│   ├── fixtures.ts
│   ├── event-spy.ts
│   └── assertions.ts
└── __tests__/
    ├── recurrence.service.test.ts
    ├── conflict.service.test.ts
    ├── query.service.test.ts
    └── integration.test.ts
```

---

## Appendix B — Deviations from Generic Kit Skill

| Generic Kit Skill Pattern | CourseKit Adaptation | Reason |
|--------------------------|---------------------|--------|
| Single `KitStorage` abstract class | 8 split storage interfaces | Feature plan decision: per-entity granularity |
| `tsc` for full JS build | `bun build --target=bun` + `tsc --emitDeclarationOnly` | Bun-only runtime target |
| `"module": "commonjs"` in tsconfig | `"module": "ESNext"`, `"moduleResolution": "bundler"` | No Node consumers to support |
| No event emitter | `@nestjs/event-emitter` as peerDependency | Feature plan 1.9 |
| No validation library | `class-validator` + `class-transformer` as peers | Feature plan 1.7 |
| No domain dependencies | `rrule` as bundled dependency | Feature plan 1.5 — RRULE materialization |
| Single barrel export | Main export + `./testing` subpath export | Testing utilities separated for tree-shaking |
| `"pipeline"` in turbo.json | `"tasks"` in turbo.json | Turborepo v2 API change |

---

## Appendix C — Open Decisions for Claude Code to Resolve During Implementation

These are minor decisions that can be made during implementation. Document your choice in a comment.

1. **ID generation in in-memory adapters:** `crypto.randomUUID()` vs `cuid2`. Recommendation: `crypto.randomUUID()` — zero dependencies.
2. **DTO validation approach:** Pure `class-validator` decorators vs. static `validate()` methods that work without class instantiation. Recommendation: ship both — decorators for NestJS pipe users, static method for everyone else.
3. **`bun build` entry points:** The `--splitting` flag with multiple entry points (`src/index.ts` + `src/testing/index.ts`). Test that this produces correct chunk splitting. If it doesn't, fall back to two separate `bun build` invocations.
4. **RRULE `dtstart` handling:** `rrule.js` uses UTC by default. Ensure `materialize()` correctly maps between event `startTime` and RRULE `dtstart`. Add explicit tests for DST transitions.
