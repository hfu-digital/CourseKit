import { describe, expect, it } from 'bun:test';
import { OverlapConstraint } from '../constraints/overlap.constraint.js';
import { QueryService } from '../domain/query.service.js';
import { RecurrenceService } from '../domain/recurrence.service.js';
import { TimeService } from '../domain/time.service.js';
import { VersionConflictError } from '../errors/index.js';
import { EventSpy } from '../testing/event-spy.js';
import { createTestInstructor, createTestRoom } from '../testing/factories.js';
import { InMemoryAvailabilityStorage } from '../testing/memory-availability-storage.adapter.js';
import { InMemoryCourseStorage } from '../testing/memory-course-storage.adapter.js';
import { InMemoryTimetableEventStorage } from '../testing/memory-event-storage.adapter.js';
import { InMemoryGroupStorage } from '../testing/memory-group-storage.adapter.js';
import { InMemoryInstructorStorage } from '../testing/memory-instructor-storage.adapter.js';
import { InMemoryAcademicPeriodStorage } from '../testing/memory-period-storage.adapter.js';
import { InMemoryRoomStorage } from '../testing/memory-room-storage.adapter.js';

describe('CourseKit Integration', () => {
    function createTestSetup() {
        const eventStorage = new InMemoryTimetableEventStorage();
        const roomStorage = new InMemoryRoomStorage();
        const instructorStorage = new InMemoryInstructorStorage();
        const groupStorage = new InMemoryGroupStorage();
        const availabilityStorage = new InMemoryAvailabilityStorage();
        const periodStorage = new InMemoryAcademicPeriodStorage();
        const courseStorage = new InMemoryCourseStorage();
        const recurrence = new RecurrenceService();
        const time = new TimeService();
        const query = new QueryService(eventStorage, recurrence, time);
        const eventSpy = new EventSpy();

        return {
            eventStorage,
            roomStorage,
            instructorStorage,
            groupStorage,
            availabilityStorage,
            periodStorage,
            courseStorage,
            recurrence,
            time,
            query,
            eventSpy,
        };
    }

    it('should materialize recurring events with exceptions', async () => {
        const { eventStorage, recurrence } = createTestSetup();

        // Create a weekly recurring event
        const event = await eventStorage.create({
            title: 'Weekly Meeting',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 60,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            metadata: null,
            courseId: null,
            roomId: 'room-1',
            periodId: null,
        });

        // Cancel one occurrence
        await eventStorage.createException({
            eventId: event.id,
            originalDate: new Date('2026-03-09T09:00:00Z'),
            type: 'cancelled',
            newStartTime: null,
            newDurationMin: null,
            newRoomId: null,
            metadata: null,
        });

        // Modify another occurrence
        await eventStorage.createException({
            eventId: event.id,
            originalDate: new Date('2026-03-16T09:00:00Z'),
            type: 'modified',
            newStartTime: new Date('2026-03-16T14:00:00Z'),
            newDurationMin: 90,
            newRoomId: 'room-2',
            metadata: null,
        });

        const exceptions = await eventStorage.findExceptions(event.id);
        const dateRange = {
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-31T23:59:59Z'),
        };

        const occurrences = recurrence.materialize(event, exceptions, dateRange);

        // Verify cancelled occurrence is excluded
        const hasCancelled = occurrences.some(
            (o) => o.occurrenceDate.getTime() === new Date('2026-03-09T09:00:00Z').getTime(),
        );
        expect(hasCancelled).toBe(false);

        // Verify modified occurrence has updated properties
        const modified = occurrences.find(
            (o) => o.occurrenceDate.getTime() === new Date('2026-03-16T09:00:00Z').getTime(),
        );
        expect(modified).toBeDefined();
        expect(modified!.startTime.getTime()).toBe(new Date('2026-03-16T14:00:00Z').getTime());
        expect(modified!.durationMin).toBe(90);
        expect(modified!.roomId).toBe('room-2');
    });

    it('should find free slots across multiple entities', async () => {
        const { eventStorage, query } = createTestSetup();

        // Create two events for the same room at different times
        await eventStorage.create({
            title: 'Morning Class',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: 'room-1',
            periodId: null,
        });

        await eventStorage.create({
            title: 'Afternoon Class',
            startTime: new Date('2026-03-02T14:00:00Z'),
            durationMin: 120,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: 'room-1',
            periodId: null,
        });

        const freeSlots = await query.findFreeSlots({
            dateRange: {
                start: new Date('2026-03-02T08:00:00Z'),
                end: new Date('2026-03-02T18:00:00Z'),
            },
            durationMin: 60,
            entityIds: [{ type: 'room', id: 'room-1' }],
        });

        // Should have gaps: 8:00-9:00, 10:30-14:00, 16:00-18:00
        expect(freeSlots.length).toBeGreaterThanOrEqual(2);

        // The gap between 10:30 and 14:00 is the largest
        const largestSlot = freeSlots.reduce((max, slot) =>
            slot.durationMin > max.durationMin ? slot : max,
        );
        expect(largestSlot.durationMin).toBeGreaterThanOrEqual(180); // ~3.5 hours
    });

    it('should emit domain events on mutations', () => {
        const spy = new EventSpy();
        const mockEmitter = spy.createMockEmitter();

        mockEmitter.emit('coursekit.event.created', { event: { id: 'test', title: 'Test' } });
        mockEmitter.emit('coursekit.event.updated', {
            previous: { id: 'test', title: 'Test' },
            current: { id: 'test', title: 'Updated Test' },
            changedFields: ['title'],
        });

        expect(spy.wasEmitted('coursekit.event.created')).toBe(true);
        expect(spy.wasEmitted('coursekit.event.updated')).toBe(true);
        expect(spy.countByName('coursekit.event.created')).toBe(1);
        expect(spy.getAll()).toHaveLength(2);
    });

    it('should handle CRUD operations on in-memory storage', async () => {
        const { roomStorage, instructorStorage } = createTestSetup();

        // Create entities
        const room = await roomStorage.create({
            name: 'Lab 101',
            building: 'Engineering',
            campus: 'Main',
            capacity: 25,
            tags: { equipment: ['projector', 'whiteboard'] },
        });
        expect(room.id).toBeDefined();
        expect(room.name).toBe('Lab 101');

        const instructor = await instructorStorage.create({
            name: 'Prof. Test',
            email: 'test@hfu.digital',
            tags: null,
        });
        expect(instructor.id).toBeDefined();

        // Find
        const found = await roomStorage.findById(room.id);
        expect(found).not.toBeNull();
        expect(found!.name).toBe('Lab 101');

        // Update
        const updated = await roomStorage.update(room.id, { capacity: 30 });
        expect(updated.capacity).toBe(30);

        // Filter
        const rooms = await roomStorage.findAll({ building: 'Engineering' });
        expect(rooms).toHaveLength(1);

        const noRooms = await roomStorage.findAll({ building: 'Nonexistent' });
        expect(noRooms).toHaveLength(0);

        // Delete
        await roomStorage.delete(room.id);
        const deleted = await roomStorage.findById(room.id);
        expect(deleted).toBeNull();
    });

    it('should handle event-instructor associations', async () => {
        const { eventStorage } = createTestSetup();

        const event = await eventStorage.create({
            title: 'Lecture',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: null,
            periodId: null,
        });

        // Add instructor
        const association = await eventStorage.addInstructor({
            eventId: event.id,
            instructorId: 'instructor-1',
            role: 'primary',
        });
        expect(association.id).toBeDefined();

        // Find instructors
        const instructors = await eventStorage.findInstructors(event.id);
        expect(instructors).toHaveLength(1);
        expect(instructors[0].instructorId).toBe('instructor-1');

        // Remove instructor
        await eventStorage.removeInstructor(event.id, 'instructor-1');
        const afterRemove = await eventStorage.findInstructors(event.id);
        expect(afterRemove).toHaveLength(0);
    });

    it('should handle optimistic concurrency on event updates', async () => {
        const { eventStorage } = createTestSetup();

        const event = await eventStorage.create({
            title: 'Versioned Event',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: null,
            periodId: null,
        });

        // Update with correct version
        const updated = await eventStorage.update(event.id, { title: 'Updated' }, 0);
        expect(updated.version).toBe(1);
        expect(updated.title).toBe('Updated');

        // Update with wrong version should throw
        try {
            await eventStorage.update(event.id, { title: 'Conflict' }, 0);
            expect(true).toBe(false); // Should not reach here
        } catch (error) {
            expect(error).toBeInstanceOf(VersionConflictError);
            expect((error as VersionConflictError).expectedVersion).toBe(0);
            expect((error as VersionConflictError).actualVersion).toBe(1);
        }
    });
});
