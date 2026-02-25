# CourseKit

A timetable engine for academic scheduling: recurring events, conflict detection, availability management, and a React frontend. Ships as `@hfu.digital/coursekit-nestjs` + `@hfu.digital/coursekit-react`.

## Prerequisites

- **Bun** >= 1.0
- **NestJS** >= 10
- **React** >= 18

## Installation

```bash
# Backend
bun add @hfu.digital/coursekit-nestjs

# Frontend
bun add @hfu.digital/coursekit-react
```

Peer dependencies you need in your project:

```bash
# For @hfu.digital/coursekit-nestjs
bun add @nestjs/common @nestjs/core @nestjs/event-emitter rxjs class-validator class-transformer

# For @hfu.digital/coursekit-react
bun add react react-dom
```

## Prisma Schema Reference

CourseKit uses structural typing — it never imports `@prisma/client`. Add these models to your Prisma schema:

```prisma
model TimetableEvent {
    id              String              @id @default(uuid())
    title           String
    startTime       DateTime
    durationMin     Int
    recurrenceRule  String?
    metadata        Json?
    courseId         String?
    roomId          String?
    periodId        String?
    version         Int                 @default(0)
    createdAt       DateTime            @default(now())
    updatedAt       DateTime            @updatedAt

    exceptions      EventException[]
    instructors     EventInstructor[]
    groups          EventGroup[]
    room            Room?               @relation(fields: [roomId], references: [id])
    course          Course?             @relation(fields: [courseId], references: [id])
    period          AcademicPeriod?     @relation(fields: [periodId], references: [id])
}

model EventException {
    id              String              @id @default(uuid())
    eventId         String
    originalDate    DateTime
    type            String              // 'cancelled' | 'modified' | 'added'
    newStartTime    DateTime?
    newDurationMin  Int?
    newRoomId       String?
    metadata        Json?

    event           TimetableEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
}

model EventInstructor {
    id              String              @id @default(uuid())
    eventId         String
    instructorId    String
    role            String              @default("primary")

    event           TimetableEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
    instructor      Instructor          @relation(fields: [instructorId], references: [id])
}

model EventGroup {
    id              String              @id @default(uuid())
    eventId         String
    groupId         String

    event           TimetableEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
    group           Group               @relation(fields: [groupId], references: [id])
}

model Instructor {
    id              String              @id @default(uuid())
    name            String
    email           String?
    tags            Json?

    events          EventInstructor[]
    availability    Availability[]
}

model Room {
    id              String              @id @default(uuid())
    name            String
    building        String?
    campus          String?
    capacity        Int                 @default(0)
    tags            Json?

    events          TimetableEvent[]
    availability    Availability[]
}

model Group {
    id              String              @id @default(uuid())
    name            String
    type            String              // 'fixed' | 'enrollment'
    maxCapacity     Int?

    events          EventGroup[]
    students        StudentGroup[]
}

model Student {
    id              String              @id @default(uuid())
    name            String
    email           String?

    groups          StudentGroup[]
}

model StudentGroup {
    id              String              @id @default(uuid())
    studentId       String
    groupId         String

    student         Student             @relation(fields: [studentId], references: [id])
    group           Group               @relation(fields: [groupId], references: [id])
}

model Course {
    id              String              @id @default(uuid())
    name            String
    code            String?
    parentId        String?
    metadata        Json?

    events          TimetableEvent[]
    parent          Course?             @relation("CourseHierarchy", fields: [parentId], references: [id])
    children        Course[]            @relation("CourseHierarchy")
}

model Availability {
    id              String              @id @default(uuid())
    entityType      String              // 'instructor' | 'room'
    entityId        String
    dayOfWeek       Int?
    specificDate    DateTime?
    startTime       DateTime
    endTime         DateTime
    type            String              // 'available' | 'blocked' | 'preferred'
    hardness        String              // 'hard' | 'soft'
    priority        Int                 @default(0)
    recurrenceRule  String?
}

model AcademicPeriod {
    id              String              @id @default(uuid())
    name            String
    type            String              // 'semester' | 'holiday' | 'exam' | 'break'
    startDate       DateTime
    endDate         DateTime
    parentId        String?

    events          TimetableEvent[]
    parent          AcademicPeriod?     @relation("PeriodHierarchy", fields: [parentId], references: [id])
    children        AcademicPeriod[]    @relation("PeriodHierarchy")
}

model LocationDistance {
    id              String              @id @default(uuid())
    fromCampus      String
    toCampus        String
    travelMinutes   Int
}
```

## Backend Integration

### Basic Setup

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

### Using Services

```typescript
import { Injectable } from '@nestjs/common';
import { QueryService, RecurrenceService, ConflictService } from '@hfu.digital/coursekit-nestjs';

@Injectable()
export class TimetableController {
    constructor(
        private readonly query: QueryService,
        private readonly conflicts: ConflictService,
    ) {}

    async getWeekSchedule(instructorId: string) {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.query.getEntitySchedule('instructor', instructorId, {
            start: now,
            end: weekEnd,
        });
    }
}
```

### Listening to Domain Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, type EventCreatedPayload } from '@hfu.digital/coursekit-nestjs';

@Injectable()
export class NotificationService {
    @OnEvent(DOMAIN_EVENTS.EVENT_CREATED)
    handleEventCreated(payload: EventCreatedPayload) {
        console.log('New event:', payload.event.title);
    }

    @OnEvent(DOMAIN_EVENTS.CONFLICT_DETECTED)
    handleConflict(payload: ConflictDetectedPayload) {
        console.warn('Conflicts detected:', payload.result.conflicts.length);
    }
}
```

## Frontend Integration

### Provider Setup

```tsx
import { CourseKitProvider } from '@hfu.digital/coursekit-react';

function App() {
    return (
        <CourseKitProvider
            apiUrl="https://api.example.com/coursekit"
            fetch={(url, init) => fetch(url, {
                ...init,
                headers: { ...init?.headers, Authorization: `Bearer ${token}` },
            })}
        >
            <MySchedule />
        </CourseKitProvider>
    );
}
```

### Using Hooks

```tsx
import { useTimetable, useConflictCheck, TimetableGrid, EventCard } from '@hfu.digital/coursekit-react';

function MySchedule() {
    const { data, loading } = useTimetable({
        dateRange: { start: '2026-03-02', end: '2026-03-08' },
        instructorIds: ['instructor-1'],
    });

    if (loading) return <div>Loading...</div>;

    return (
        <TimetableGrid weekStart="2026-03-02">
            {data.map(occ => (
                <EventCard
                    key={`${occ.eventId}-${occ.occurrenceDate}`}
                    title={occ.originalEvent.title}
                    startTime={occ.startTime}
                    durationMin={occ.durationMin}
                    isException={occ.isException}
                    exceptionType={occ.exceptionType}
                />
            ))}
        </TimetableGrid>
    );
}
```

## Custom Adapter Guide

To use a different ORM (TypeORM, Drizzle, Knex, etc.), implement the abstract storage classes:

```typescript
import { TimetableEventStorage } from '@hfu.digital/coursekit-nestjs';
import type { TimetableEvent, ScheduleQuery } from '@hfu.digital/coursekit-nestjs';

export class DrizzleTimetableEventAdapter extends TimetableEventStorage {
    constructor(private readonly db: DrizzleDB) { super(); }

    async create(data) {
        const [event] = await this.db.insert(events).values(data).returning();
        return event;
    }

    async findById(id: string) {
        return this.db.query.events.findFirst({ where: eq(events.id, id) });
    }

    // ... implement all abstract methods
}
```

## Built-in Constraints

| Constraint | Type | Severity | Description |
|------------|------|----------|-------------|
| `OverlapConstraint` | `overlap` | `error` | Detects instructor and room double-bookings |
| `CapacityConstraint` | `capacity` | `warning` | Checks room capacity against group size |
| `AvailabilityConstraint` | `availability` | `error`/`warning` | Checks events against entity availability rules |

### Custom Constraints

```typescript
import { ScheduleConstraint, type ConstraintContext } from '@hfu.digital/coursekit-nestjs';
import type { MaterializedOccurrence, Conflict } from '@hfu.digital/coursekit-nestjs';

export class MinBreakConstraint extends ScheduleConstraint {
    readonly type = 'min-break';
    readonly description = 'Ensures minimum break between consecutive events';

    async evaluate(occurrences: MaterializedOccurrence[], context: ConstraintContext): Promise<Conflict[]> {
        // Your constraint logic here
        return [];
    }
}

// Register in module:
CourseKitModule.register({
    // ...storage adapters
    constraints: [new MinBreakConstraint()],
});
```

## RRULE Examples

Common recurrence patterns for academic scheduling:

```typescript
// Weekly lecture on Monday
'FREQ=WEEKLY;BYDAY=MO'

// Bi-weekly on Tuesday and Thursday
'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH'

// Daily for 14 weeks (one semester)
'FREQ=DAILY;COUNT=70;BYDAY=MO,TU,WE,TH,FR'

// Every Monday until end of semester
'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260731T235959Z'

// Monthly faculty meeting, first Wednesday
'FREQ=MONTHLY;BYDAY=1WE'
```

## Testing

Use the `@hfu.digital/coursekit-nestjs/testing` subpath for in-memory testing:

```typescript
import { Test } from '@nestjs/testing';
import { CourseKitModule } from '@hfu.digital/coursekit-nestjs';
import {
    InMemoryTimetableEventStorage,
    InMemoryRoomStorage,
    InMemoryInstructorStorage,
    InMemoryGroupStorage,
    InMemoryAvailabilityStorage,
    InMemoryAcademicPeriodStorage,
    InMemoryCourseStorage,
    createTestEvent,
    createTestRoom,
    expectNoConflicts,
    expectConflict,
} from '@hfu.digital/coursekit-nestjs/testing';

describe('Schedule', () => {
    it('should detect double-booking', async () => {
        const module = await Test.createTestingModule({
            imports: [CourseKitModule.register({
                eventStorage: new InMemoryTimetableEventStorage(),
                roomStorage: new InMemoryRoomStorage(),
                instructorStorage: new InMemoryInstructorStorage(),
                groupStorage: new InMemoryGroupStorage(),
                availabilityStorage: new InMemoryAvailabilityStorage(),
                periodStorage: new InMemoryAcademicPeriodStorage(),
                courseStorage: new InMemoryCourseStorage(),
            })],
        }).compile();

        // Use factories and assertion helpers
        const event = createTestEvent({ title: 'Math 101' });
        const room = createTestRoom({ capacity: 50 });
        // ...
    });
});
```

## API Reference

### Domain Services

| Service | Key Methods |
|---------|-------------|
| `RecurrenceService` | `materialize()`, `materializeSingle()`, `parseRule()`, `validateRule()` |
| `TimeService` | `overlaps()`, `endTime()`, `isInRange()`, `gapMinutes()` |
| `AvailabilityService` | `create()`, `update()`, `delete()`, `isAvailable()`, `findFreeSlots()` |
| `ConflictService` | `check()`, `dryRun()` |
| `QueryService` | `getSchedule()`, `findFreeSlots()`, `getEntitySchedule()` |

### React Hooks

| Hook | Description |
|------|-------------|
| `useTimetable(query)` | Fetch schedule for entity + date range |
| `useAvailability(query)` | Fetch free/busy for entity |
| `useConflictCheck()` | Real-time conflict preview for proposed event |
| `useMutation(options?)` | Create/update/delete events |
| `useRoomSearch(query?)` | Search rooms by capacity, availability |

### React Components

| Component | Description |
|-----------|-------------|
| `TimetableGrid` | Week/day grid view, configurable time axis |
| `EventCard` | Single event display with exception styling |
| `ConflictBadge` | Visual conflict indicator |
| `AvailabilityOverlay` | Free/busy overlay on grid |

## Development

```bash
bun install
bun run build        # Build both packages
bun run typecheck    # Type-check both packages
bun run test         # Run all tests
bun run dev          # Watch mode
```

## License

MIT
