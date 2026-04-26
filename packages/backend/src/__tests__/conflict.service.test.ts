import { describe, expect, it } from 'bun:test';
import { OverlapConstraint } from '../constraints/overlap.constraint.js';
import type { ConstraintContext as CC } from '../interfaces/constraint.interface.js';
import type {
    ConstraintContext,
    DateRange,
    MaterializedOccurrence,
    TimetableEvent,
} from '../interfaces/types.js';
import { createTestEvent } from '../testing/factories.js';

describe('OverlapConstraint', () => {
    const constraint = new OverlapConstraint();

    function makeOccurrence(event: TimetableEvent): MaterializedOccurrence {
        return {
            eventId: event.id,
            occurrenceDate: event.startTime,
            startTime: event.startTime,
            durationMin: event.durationMin,
            roomId: event.roomId,
            metadata: event.metadata,
            isException: false,
            exceptionType: null,
            originalEvent: event,
        };
    }

    it('should detect room overlap', async () => {
        const roomId = 'room-1';
        const event1 = createTestEvent({
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            roomId,
        });
        const event2 = createTestEvent({
            startTime: new Date('2026-03-02T09:30:00Z'),
            durationMin: 90,
            roomId,
        });

        const occurrences = [makeOccurrence(event1), makeOccurrence(event2)];

        const context: CC = {
            dateRange: { start: new Date('2026-03-01'), end: new Date('2026-03-07') },
            allEvents: [event1, event2],
            getInstructorsForEvent: async () => [],
            getGroupsForEvent: async () => [],
            getRoomById: async () => null,
            getGroupStudentCount: async () => 0,
            isEntityAvailable: async () => ({ available: true, conflicts: [] }),
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts[0].type).toBe('room-overlap');
        expect(conflicts[0].severity).toBe('error');
    });

    it('should detect instructor double-booking', async () => {
        const instructorId = 'instructor-1';
        const event1 = createTestEvent({
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            roomId: 'room-1',
        });
        const event2 = createTestEvent({
            startTime: new Date('2026-03-02T09:30:00Z'),
            durationMin: 90,
            roomId: 'room-2',
        });

        const occurrences = [makeOccurrence(event1), makeOccurrence(event2)];

        const context: CC = {
            dateRange: { start: new Date('2026-03-01'), end: new Date('2026-03-07') },
            allEvents: [event1, event2],
            getInstructorsForEvent: async (eventId) => {
                // Both events have the same instructor
                return [instructorId];
            },
            getGroupsForEvent: async () => [],
            getRoomById: async () => null,
            getGroupStudentCount: async () => 0,
            isEntityAvailable: async () => ({ available: true, conflicts: [] }),
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts.some((c) => c.type === 'instructor-double-book')).toBe(true);
    });

    it('should not flag adjacent (non-overlapping) events', async () => {
        const roomId = 'room-1';
        const event1 = createTestEvent({
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 60,
            roomId,
        });
        const event2 = createTestEvent({
            startTime: new Date('2026-03-02T10:00:00Z'),
            durationMin: 60,
            roomId,
        });

        const occurrences = [makeOccurrence(event1), makeOccurrence(event2)];

        const context: CC = {
            dateRange: { start: new Date('2026-03-01'), end: new Date('2026-03-07') },
            allEvents: [event1, event2],
            getInstructorsForEvent: async () => [],
            getGroupsForEvent: async () => [],
            getRoomById: async () => null,
            getGroupStudentCount: async () => 0,
            isEntityAvailable: async () => ({ available: true, conflicts: [] }),
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(0);
    });
});
