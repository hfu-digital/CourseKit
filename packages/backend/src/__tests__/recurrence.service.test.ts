import { describe, it, expect } from 'bun:test';
import { RecurrenceService } from '../domain/recurrence.service.js';
import { createTestEvent, createTestException } from '../testing/factories.js';
import type { DateRange } from '../interfaces/types.js';

describe('RecurrenceService', () => {
    const service = new RecurrenceService();

    describe('validateRule', () => {
        it('should return null for valid RRULE', () => {
            expect(service.validateRule('FREQ=WEEKLY;BYDAY=MO')).toBeNull();
        });

        it('should return error message for invalid RRULE', () => {
            const result = service.validateRule('INVALID');
            expect(result).not.toBeNull();
        });
    });

    describe('materializeSingle', () => {
        it('should return occurrence when event is within range', () => {
            const event = createTestEvent({
                startTime: new Date('2026-03-02T09:00:00Z'),
                durationMin: 90,
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-07T23:59:59Z'),
            };

            const result = service.materializeSingle(event, range);
            expect(result).not.toBeNull();
            expect(result!.eventId).toBe(event.id);
            expect(result!.durationMin).toBe(90);
        });

        it('should return null when event is outside range', () => {
            const event = createTestEvent({
                startTime: new Date('2026-04-01T09:00:00Z'),
                durationMin: 90,
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-07T23:59:59Z'),
            };

            const result = service.materializeSingle(event, range);
            expect(result).toBeNull();
        });
    });

    describe('materialize', () => {
        it('should materialize non-recurring event', () => {
            const event = createTestEvent({
                startTime: new Date('2026-03-02T09:00:00Z'),
                durationMin: 90,
                recurrenceRule: null,
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-07T23:59:59Z'),
            };

            const result = service.materialize(event, [], range);
            expect(result).toHaveLength(1);
            expect(result[0].isException).toBe(false);
        });

        it('should materialize recurring event with weekly rule', () => {
            const event = createTestEvent({
                startTime: new Date('2026-03-02T09:00:00Z'),
                durationMin: 90,
                recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-31T23:59:59Z'),
            };

            const result = service.materialize(event, [], range);
            // Mondays in March 2026: 2, 9, 16, 23, 30
            expect(result.length).toBeGreaterThanOrEqual(4);
            result.forEach(occ => {
                expect(occ.startTime.getDay()).toBe(1); // Monday
            });
        });

        it('should handle cancelled exceptions', () => {
            const event = createTestEvent({
                startTime: new Date('2026-03-02T09:00:00Z'),
                durationMin: 90,
                recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            });

            const cancelDate = new Date('2026-03-09T09:00:00Z');
            const exception = createTestException({
                eventId: event.id,
                originalDate: cancelDate,
                type: 'cancelled',
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-31T23:59:59Z'),
            };

            const result = service.materialize(event, [exception], range);
            // March 9 should be excluded
            const hasMarch9 = result.some(
                occ => occ.occurrenceDate.getTime() === cancelDate.getTime(),
            );
            expect(hasMarch9).toBe(false);
        });

        it('should handle modified exceptions', () => {
            const event = createTestEvent({
                startTime: new Date('2026-03-02T09:00:00Z'),
                durationMin: 90,
                recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            });

            const modifyDate = new Date('2026-03-09T09:00:00Z');
            const newStartTime = new Date('2026-03-09T14:00:00Z');
            const exception = createTestException({
                eventId: event.id,
                originalDate: modifyDate,
                type: 'modified',
                newStartTime,
                newDurationMin: 120,
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-31T23:59:59Z'),
            };

            const result = service.materialize(event, [exception], range);
            const modified = result.find(
                occ => occ.occurrenceDate.getTime() === modifyDate.getTime(),
            );
            expect(modified).toBeDefined();
            expect(modified!.isException).toBe(true);
            expect(modified!.exceptionType).toBe('modified');
            expect(modified!.startTime.getTime()).toBe(newStartTime.getTime());
            expect(modified!.durationMin).toBe(120);
        });

        it('should handle added exceptions', () => {
            const event = createTestEvent({
                startTime: new Date('2026-03-02T09:00:00Z'),
                durationMin: 90,
                recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            });

            const addedDate = new Date('2026-03-11T10:00:00Z'); // Wednesday
            const exception = createTestException({
                eventId: event.id,
                originalDate: addedDate,
                type: 'added',
                newStartTime: addedDate,
                newDurationMin: 60,
            });

            const range: DateRange = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-31T23:59:59Z'),
            };

            const result = service.materialize(event, [exception], range);
            const added = result.find(
                occ => occ.exceptionType === 'added',
            );
            expect(added).toBeDefined();
            expect(added!.durationMin).toBe(60);
        });
    });
});
