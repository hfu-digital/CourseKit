/**
 * Response DTO types for HTTP transport.
 *
 * Domain types (`MaterializedOccurrence`, `Conflict`, `Availability`, `FreeSlot`)
 * use native `Date` objects for in-process work. Across an HTTP boundary, those
 * dates need to be serialized as ISO 8601 strings, and we want to avoid leaking
 * fields that should remain private to the storage layer (e.g., the Prisma
 * `version` field on the embedded `originalEvent`).
 *
 * Use the `toOccurrenceDto`/`toConflictDto`/etc. helpers in `../dto/transform.ts`
 * to convert from domain types to these DTOs at the boundary.
 */

import type {
    AvailabilityEntityType,
    AvailabilityHardness,
    AvailabilityType,
    ConflictSeverity,
    EventException,
} from './types.js';

/** ISO 8601 timestamp string. */
export type IsoDateTime = string;

/** ISO 8601 date string (YYYY-MM-DD). */
export type IsoDate = string;

export interface OccurrenceEventSummaryDto {
    id: string;
    title: string;
    courseId: string | null;
    periodId: string | null;
}

export interface OccurrenceDto {
    eventId: string;
    occurrenceDate: IsoDate;
    startTime: IsoDateTime;
    endTime: IsoDateTime;
    durationMin: number;
    roomId: string | null;
    metadata: Record<string, unknown> | null;
    isException: boolean;
    exceptionType: EventException['type'] | null;
    event: OccurrenceEventSummaryDto;
}

export interface DateRangeDto {
    start: IsoDateTime;
    end: IsoDateTime;
}

export interface ScheduleResponseDto {
    dateRange: DateRangeDto;
    occurrences: OccurrenceDto[];
}

export interface ConflictDto {
    id: string;
    type: string;
    severity: ConflictSeverity;
    message: string;
    involvedEventIds: string[];
    involvedEntityIds: string[];
    metadata: Record<string, unknown>;
}

export interface ConflictCheckResponseDto {
    hasErrors: boolean;
    hasWarnings: boolean;
    conflicts: ConflictDto[];
}

export interface FreeSlotDto {
    start: IsoDateTime;
    end: IsoDateTime;
    durationMin: number;
}

export interface AvailabilityDto {
    id: string;
    entityType: AvailabilityEntityType;
    entityId: string;
    dayOfWeek: number | null;
    specificDate: IsoDate | null;
    startTime: IsoDateTime;
    endTime: IsoDateTime;
    type: AvailabilityType;
    hardness: AvailabilityHardness;
    priority: number;
    recurrenceRule: string | null;
}
