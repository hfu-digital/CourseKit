# @hfu.digital/coursekit-nestjs

Timetable engine for academic scheduling: recurring events, conflict detection, availability management, and a pluggable constraint system. Ships as a NestJS dynamic module with storage adapters for any ORM.

Part of [CourseKit](https://github.com/hfu-digital/CourseKit) — see the monorepo for the React frontend (`@hfu.digital/coursekit-react`).

## Installation

```bash
bun add @hfu.digital/coursekit-nestjs
```

Peer dependencies:

```bash
bun add @nestjs/common @nestjs/core @nestjs/event-emitter rxjs class-validator class-transformer
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
    CourseKitModule,
    PrismaTimetableEventAdapter,
    PrismaRoomAdapter,
    PrismaInstructorAdapter,
    PrismaGroupAdapter,
    PrismaAvailabilityAdapter,
    PrismaAcademicPeriodAdapter,
    PrismaCourseAdapter,
    PrismaLocationDistanceAdapter,
} from '@hfu.digital/coursekit-nestjs';

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
            groupStorage: new PrismaGroupAdapter(prisma.group, prisma.studentGroup),
            availabilityStorage: new PrismaAvailabilityAdapter(prisma.availability),
            periodStorage: new PrismaAcademicPeriodAdapter(prisma.academicPeriod),
            courseStorage: new PrismaCourseAdapter(prisma.course),
            locationDistanceStorage: new PrismaLocationDistanceAdapter(prisma.locationDistance),
        }),
    ],
})
export class AppModule {}
```

## Domain Services

| Service | Key Methods |
|---------|-------------|
| `RecurrenceService` | `materialize()`, `materializeSingle()`, `parseRule()`, `validateRule()` |
| `TimeService` | `overlaps()`, `endTime()`, `isInRange()`, `gapMinutes()` |
| `AvailabilityService` | `create()`, `update()`, `delete()`, `isAvailable()`, `findFreeSlots()` |
| `ConflictService` | `check()`, `dryRun()` |
| `QueryService` | `getSchedule()`, `findFreeSlots()`, `getEntitySchedule()` |

## Built-in Constraints

| Constraint | Type | Severity | Description |
|------------|------|----------|-------------|
| `OverlapConstraint` | `overlap` | `error` | Detects instructor and room double-bookings |
| `CapacityConstraint` | `capacity` | `warning` | Checks room capacity against group student count |
| `AvailabilityConstraint` | `availability` | `error`/`warning` | Checks events against entity availability rules |

Custom constraints can be registered via `CourseKitModule.register({ constraints: [...] })`. Built-ins can be disabled with `enableBuiltInConstraints: false`.

## Storage Adapters

The backend uses a hexagonal architecture — all persistence is behind abstract storage classes. Prisma adapters are included, but you can implement adapters for any ORM (Drizzle, TypeORM, Knex, etc.) by extending the abstract classes.

## Testing

Use `@hfu.digital/coursekit-nestjs/testing` for in-memory adapters and test utilities:

```typescript
import {
    InMemoryTimetableEventStorage,
    InMemoryRoomStorage,
    createTestEvent,
    createTestRoom,
    expectNoConflicts,
} from '@hfu.digital/coursekit-nestjs/testing';
```

## License

MIT
