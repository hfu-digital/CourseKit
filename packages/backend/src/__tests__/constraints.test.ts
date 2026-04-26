import { describe, expect, it } from 'bun:test';
import { AvailabilityConstraint } from '../constraints/availability.constraint.js';
import { CapacityConstraint } from '../constraints/capacity.constraint.js';
import type { ConstraintContext } from '../interfaces/constraint.interface.js';
import type { MaterializedOccurrence, Room, TimetableEvent } from '../interfaces/types.js';
import { createTestEvent, createTestRoom } from '../testing/factories.js';

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

function makeBaseContext(events: TimetableEvent[]): ConstraintContext {
    return {
        dateRange: { start: new Date('2026-03-01'), end: new Date('2026-03-07') },
        allEvents: events,
        getInstructorsForEvent: async () => [],
        getGroupsForEvent: async () => [],
        getRoomById: async () => null,
        getGroupStudentCount: async () => 0,
        isEntityAvailable: async () => ({ available: true, conflicts: [] }),
    };
}

describe('CapacityConstraint', () => {
    const constraint = new CapacityConstraint();

    it('should detect room over-capacity', async () => {
        const room = createTestRoom({ capacity: 20 });
        const event = createTestEvent({ roomId: room.id });
        const occurrences = [makeOccurrence(event)];

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getGroupsForEvent: async () => ['group-1'],
            getRoomById: async (roomId: string) => (roomId === room.id ? room : null),
            getGroupStudentCount: async () => 35,
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].type).toBe('room-over-capacity');
        expect(conflicts[0].severity).toBe('warning');
        expect(conflicts[0].metadata.roomCapacity).toBe(20);
        expect(conflicts[0].metadata.totalStudents).toBe(35);
        expect(conflicts[0].metadata.excess).toBe(15);
    });

    it('should not flag when room capacity is sufficient', async () => {
        const room = createTestRoom({ capacity: 50 });
        const event = createTestEvent({ roomId: room.id });
        const occurrences = [makeOccurrence(event)];

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getGroupsForEvent: async () => ['group-1'],
            getRoomById: async (roomId: string) => (roomId === room.id ? room : null),
            getGroupStudentCount: async () => 25,
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(0);
    });

    it('should skip events without a room', async () => {
        const event = createTestEvent({ roomId: null });
        const occurrences = [makeOccurrence(event)];
        const context = makeBaseContext([event]);

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(0);
    });

    it('should skip events without groups', async () => {
        const room = createTestRoom({ capacity: 20 });
        const event = createTestEvent({ roomId: room.id });
        const occurrences = [makeOccurrence(event)];

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getRoomById: async () => room,
            getGroupsForEvent: async () => [],
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(0);
    });

    it('should sum students across multiple groups', async () => {
        const room = createTestRoom({ capacity: 30 });
        const event = createTestEvent({ roomId: room.id });
        const occurrences = [makeOccurrence(event)];

        const groupStudents: Record<string, number> = {
            'group-1': 15,
            'group-2': 20,
        };

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getGroupsForEvent: async () => ['group-1', 'group-2'],
            getRoomById: async () => room,
            getGroupStudentCount: async (groupId: string) => groupStudents[groupId] ?? 0,
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].metadata.totalStudents).toBe(35);
    });
});

describe('AvailabilityConstraint', () => {
    const constraint = new AvailabilityConstraint();

    it('should detect instructor availability violation (hard block)', async () => {
        const event = createTestEvent({ roomId: 'room-1' });
        const occurrences = [makeOccurrence(event)];

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getInstructorsForEvent: async () => ['instructor-1'],
            isEntityAvailable: async (entityType, entityId) => {
                if (entityType === 'instructor' && entityId === 'instructor-1') {
                    return {
                        available: false,
                        conflicts: [
                            {
                                id: 'block-1',
                                entityType: 'instructor',
                                entityId: 'instructor-1',
                                dayOfWeek: null,
                                specificDate: null,
                                startTime: new Date('2026-03-02T08:00:00Z'),
                                endTime: new Date('2026-03-02T12:00:00Z'),
                                type: 'blocked' as const,
                                hardness: 'hard' as const,
                                priority: 0,
                                recurrenceRule: null,
                            },
                        ],
                    };
                }
                return { available: true, conflicts: [] };
            },
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts[0].type).toBe('availability-violation');
        expect(conflicts[0].severity).toBe('error');
        expect(conflicts[0].metadata.entityType).toBe('instructor');
    });

    it('should detect room availability violation (soft block)', async () => {
        const event = createTestEvent({ roomId: 'room-1' });
        const occurrences = [makeOccurrence(event)];

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            isEntityAvailable: async (entityType, entityId) => {
                if (entityType === 'room' && entityId === 'room-1') {
                    return {
                        available: false,
                        conflicts: [
                            {
                                id: 'block-1',
                                entityType: 'room',
                                entityId: 'room-1',
                                dayOfWeek: null,
                                specificDate: null,
                                startTime: new Date('2026-03-02T08:00:00Z'),
                                endTime: new Date('2026-03-02T12:00:00Z'),
                                type: 'blocked' as const,
                                hardness: 'soft' as const,
                                priority: 0,
                                recurrenceRule: null,
                            },
                        ],
                    };
                }
                return { available: true, conflicts: [] };
            },
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts[0].severity).toBe('warning');
        expect(conflicts[0].metadata.hardness).toBe('soft');
    });

    it('should not flag when all entities are available', async () => {
        const event = createTestEvent({ roomId: 'room-1' });
        const occurrences = [makeOccurrence(event)];

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getInstructorsForEvent: async () => ['instructor-1'],
            isEntityAvailable: async () => ({ available: true, conflicts: [] }),
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        expect(conflicts).toHaveLength(0);
    });

    it('should check both room and instructors', async () => {
        const event = createTestEvent({ roomId: 'room-1' });
        const occurrences = [makeOccurrence(event)];

        const unavailableEntities = new Set(['instructor-1', 'room-1']);

        const context: ConstraintContext = {
            ...makeBaseContext([event]),
            getInstructorsForEvent: async () => ['instructor-1'],
            isEntityAvailable: async (entityType, entityId) => {
                if (unavailableEntities.has(entityId)) {
                    return {
                        available: false,
                        conflicts: [
                            {
                                id: `block-${entityId}`,
                                entityType,
                                entityId,
                                dayOfWeek: null,
                                specificDate: null,
                                startTime: new Date('2026-03-02T08:00:00Z'),
                                endTime: new Date('2026-03-02T12:00:00Z'),
                                type: 'blocked' as const,
                                hardness: 'hard' as const,
                                priority: 0,
                                recurrenceRule: null,
                            },
                        ],
                    };
                }
                return { available: true, conflicts: [] };
            },
        };

        const conflicts = await constraint.evaluate(occurrences, context);
        // Should have conflicts for both instructor and room
        expect(conflicts.length).toBe(2);
        const entityTypes = conflicts.map((c) => c.metadata.entityType);
        expect(entityTypes).toContain('instructor');
        expect(entityTypes).toContain('room');
    });
});
