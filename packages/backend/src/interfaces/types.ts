// ALL entity types live here. Prisma adapters map to these shapes.
// NEVER import @prisma/client — these are structural types.

// ─── Core Event ──────────────────────────────────────────────
export interface TimetableEvent {
    id: string;
    title: string;
    startTime: Date;
    durationMin: number;
    recurrenceRule: string | null; // RFC 5545 RRULE string
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
    originalDate: Date; // which occurrence this overrides
    type: 'cancelled' | 'modified' | 'added';
    newStartTime: Date | null;
    newDurationMin: number | null;
    newRoomId: string | null;
    metadata: Record<string, unknown> | null;
    /** Optimistic-locking version. Adapters that don't track concurrency may default to 0. */
    version?: number;
}

// ─── Join Tables ─────────────────────────────────────────────
export interface EventInstructor {
    id: string;
    eventId: string;
    instructorId: string;
    role: string; // "primary" | "ta" | "co-lecturer"
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
    dayOfWeek: number | null; // 0=Mon, 6=Sun
    specificDate: Date | null;
    startTime: Date;
    endTime: Date;
    type: AvailabilityType;
    hardness: AvailabilityHardness;
    priority: number;
    recurrenceRule: string | null;
    /** Optimistic-locking version. Adapters that don't track concurrency may default to 0. */
    version?: number;
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
    /** Optimistic-locking version. Adapters that don't track concurrency may default to 0. */
    version?: number;
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
    type: string; // e.g. "instructor-double-book", "room-overlap"
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
