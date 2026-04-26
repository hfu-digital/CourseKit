import { describe, expect, it } from 'bun:test';
import {
    availabilityDtoSchema,
    conflictCheckResponseDtoSchema,
    conflictDtoSchema,
    dateRangeDtoSchema,
    freeSlotDtoSchema,
    occurrenceDtoSchema,
    scheduleResponseDtoSchema,
} from '../dto/schemas.js';
import {
    toAvailabilityDto,
    toConflictCheckResponseDto,
    toConflictDto,
    toDateRangeDto,
    toFreeSlotDto,
    toOccurrenceDto,
    toScheduleResponseDto,
} from '../dto/transform.js';
import type {
    Availability,
    Conflict,
    ConflictCheckResult,
    FreeSlot,
    MaterializedOccurrence,
    TimetableEvent,
} from '../interfaces/types.js';

const makeEvent = (overrides: Partial<TimetableEvent> = {}): TimetableEvent => ({
    id: 'event-1',
    title: 'Algorithms',
    startTime: new Date('2026-04-26T08:00:00Z'),
    durationMin: 90,
    recurrenceRule: null,
    metadata: null,
    courseId: 'course-1',
    roomId: 'room-1',
    periodId: 'period-1',
    version: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
});

const makeOccurrence = (
    overrides: Partial<MaterializedOccurrence> = {},
): MaterializedOccurrence => ({
    eventId: 'event-1',
    occurrenceDate: new Date('2026-04-26T00:00:00Z'),
    startTime: new Date('2026-04-26T08:00:00Z'),
    durationMin: 90,
    roomId: 'room-1',
    metadata: null,
    isException: false,
    exceptionType: null,
    originalEvent: makeEvent(),
    ...overrides,
});

describe('DTO transforms', () => {
    describe('toDateRangeDto', () => {
        it('serializes both bounds as ISO 8601', () => {
            const dto = toDateRangeDto({
                start: new Date('2026-04-26T00:00:00Z'),
                end: new Date('2026-05-03T00:00:00Z'),
            });
            expect(dateRangeDtoSchema.parse(dto)).toEqual(dto);
        });
    });

    describe('toOccurrenceDto', () => {
        it('serializes dates and projects only public event fields', () => {
            const dto = toOccurrenceDto(makeOccurrence());
            const parsed = occurrenceDtoSchema.parse(dto);
            expect(parsed.startTime).toBe('2026-04-26T08:00:00.000Z');
            expect(parsed.endTime).toBe('2026-04-26T09:30:00.000Z');
            expect(parsed.occurrenceDate).toBe('2026-04-26');
            expect(parsed.event).toEqual({
                id: 'event-1',
                title: 'Algorithms',
                courseId: 'course-1',
                periodId: 'period-1',
            });
            // Internal fields must not leak
            expect(parsed.event as unknown as Record<string, unknown>).not.toHaveProperty(
                'version',
            );
            expect(parsed.event as unknown as Record<string, unknown>).not.toHaveProperty(
                'createdAt',
            );
        });

        it('preserves exception metadata', () => {
            const dto = toOccurrenceDto(
                makeOccurrence({ isException: true, exceptionType: 'cancelled' }),
            );
            expect(dto.isException).toBe(true);
            expect(dto.exceptionType).toBe('cancelled');
        });
    });

    describe('toScheduleResponseDto', () => {
        it('produces a schema-valid ScheduleResponseDto', () => {
            const dto = toScheduleResponseDto(
                { start: new Date('2026-04-26T00:00:00Z'), end: new Date('2026-05-03T00:00:00Z') },
                [makeOccurrence(), makeOccurrence({ eventId: 'event-2' })],
            );
            const parsed = scheduleResponseDtoSchema.parse(dto);
            expect(parsed.occurrences).toHaveLength(2);
        });
    });

    describe('toConflictDto + toConflictCheckResponseDto', () => {
        it('produces a schema-valid response', () => {
            const conflict: Conflict = {
                id: 'c1',
                type: 'instructor-double-book',
                severity: 'error',
                message: 'Instructor scheduled twice in the same slot',
                involvedEventIds: ['event-1', 'event-2'],
                involvedEntityIds: ['instructor-1'],
                metadata: { foo: 'bar' },
            };
            expect(conflictDtoSchema.parse(toConflictDto(conflict))).toEqual({
                ...conflict,
                involvedEventIds: ['event-1', 'event-2'],
                involvedEntityIds: ['instructor-1'],
                metadata: { foo: 'bar' },
            });

            const result: ConflictCheckResult = {
                hasErrors: true,
                hasWarnings: false,
                conflicts: [conflict],
            };
            const dto = toConflictCheckResponseDto(result);
            expect(conflictCheckResponseDtoSchema.parse(dto).conflicts).toHaveLength(1);
        });
    });

    describe('toFreeSlotDto', () => {
        it('serializes start/end dates', () => {
            const slot: FreeSlot = {
                start: new Date('2026-04-26T08:00:00Z'),
                end: new Date('2026-04-26T09:30:00Z'),
                durationMin: 90,
            };
            const parsed = freeSlotDtoSchema.parse(toFreeSlotDto(slot));
            expect(parsed.durationMin).toBe(90);
        });
    });

    describe('toAvailabilityDto', () => {
        it('serializes specificDate as YYYY-MM-DD', () => {
            const availability: Availability = {
                id: 'a1',
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: new Date('2026-12-24T00:00:00Z'),
                startTime: new Date('2026-12-24T00:00:00Z'),
                endTime: new Date('2026-12-24T23:59:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            };
            const parsed = availabilityDtoSchema.parse(toAvailabilityDto(availability));
            expect(parsed.specificDate).toBe('2026-12-24');
        });

        it('handles null specificDate', () => {
            const availability: Availability = {
                id: 'a2',
                entityType: 'instructor',
                entityId: 'instructor-1',
                dayOfWeek: 0,
                specificDate: null,
                startTime: new Date('2026-04-26T08:00:00Z'),
                endTime: new Date('2026-04-26T12:00:00Z'),
                type: 'preferred',
                hardness: 'soft',
                priority: 5,
                recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            };
            const parsed = availabilityDtoSchema.parse(toAvailabilityDto(availability));
            expect(parsed.specificDate).toBeNull();
            expect(parsed.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO');
        });
    });
});
