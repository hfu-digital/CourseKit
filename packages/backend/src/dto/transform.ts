/**
 * Pure transforms from CourseKit domain types to HTTP-ready DTOs.
 *
 * These transforms perform two jobs:
 *   1. Serialize `Date` objects to ISO 8601 strings.
 *   2. Project away storage-internal fields (e.g. `version`, `createdAt`/`updatedAt`)
 *      that should not appear in HTTP responses.
 */

import type {
    AvailabilityDto,
    ConflictCheckResponseDto,
    ConflictDto,
    DateRangeDto,
    FreeSlotDto,
    IsoDate,
    IsoDateTime,
    OccurrenceDto,
    ScheduleResponseDto,
} from '../interfaces/response-dto.js';
import type {
    Availability,
    Conflict,
    ConflictCheckResult,
    DateRange,
    FreeSlot,
    MaterializedOccurrence,
} from '../interfaces/types.js';

const toIsoDateTime = (date: Date): IsoDateTime => date.toISOString();

const toIsoDate = (date: Date): IsoDate => date.toISOString().slice(0, 10);

export function toDateRangeDto(range: DateRange): DateRangeDto {
    return {
        start: toIsoDateTime(range.start),
        end: toIsoDateTime(range.end),
    };
}

export function toOccurrenceDto(occurrence: MaterializedOccurrence): OccurrenceDto {
    const endTime = new Date(occurrence.startTime.getTime() + occurrence.durationMin * 60_000);
    return {
        eventId: occurrence.eventId,
        occurrenceDate: toIsoDate(occurrence.occurrenceDate),
        startTime: toIsoDateTime(occurrence.startTime),
        endTime: toIsoDateTime(endTime),
        durationMin: occurrence.durationMin,
        roomId: occurrence.roomId,
        metadata: occurrence.metadata,
        isException: occurrence.isException,
        exceptionType: occurrence.exceptionType,
        event: {
            id: occurrence.originalEvent.id,
            title: occurrence.originalEvent.title,
            courseId: occurrence.originalEvent.courseId,
            periodId: occurrence.originalEvent.periodId,
        },
    };
}

export function toScheduleResponseDto(
    dateRange: DateRange,
    occurrences: MaterializedOccurrence[],
): ScheduleResponseDto {
    return {
        dateRange: toDateRangeDto(dateRange),
        occurrences: occurrences.map(toOccurrenceDto),
    };
}

export function toConflictDto(conflict: Conflict): ConflictDto {
    return {
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        message: conflict.message,
        involvedEventIds: [...conflict.involvedEventIds],
        involvedEntityIds: [...conflict.involvedEntityIds],
        metadata: { ...conflict.metadata },
    };
}

export function toConflictCheckResponseDto(result: ConflictCheckResult): ConflictCheckResponseDto {
    return {
        hasErrors: result.hasErrors,
        hasWarnings: result.hasWarnings,
        conflicts: result.conflicts.map(toConflictDto),
    };
}

export function toFreeSlotDto(slot: FreeSlot): FreeSlotDto {
    return {
        start: toIsoDateTime(slot.start),
        end: toIsoDateTime(slot.end),
        durationMin: slot.durationMin,
    };
}

export function toAvailabilityDto(availability: Availability): AvailabilityDto {
    return {
        id: availability.id,
        entityType: availability.entityType,
        entityId: availability.entityId,
        dayOfWeek: availability.dayOfWeek,
        specificDate: availability.specificDate ? toIsoDate(availability.specificDate) : null,
        startTime: toIsoDateTime(availability.startTime),
        endTime: toIsoDateTime(availability.endTime),
        type: availability.type,
        hardness: availability.hardness,
        priority: availability.priority,
        recurrenceRule: availability.recurrenceRule,
    };
}
