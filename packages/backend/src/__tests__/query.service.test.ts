import { describe, expect, it } from 'bun:test';
import { QueryService } from '../domain/query.service.js';
import { RecurrenceService } from '../domain/recurrence.service.js';
import { TimeService } from '../domain/time.service.js';
import type { DateRange } from '../interfaces/types.js';
import { InMemoryTimetableEventStorage } from '../testing/memory-event-storage.adapter.js';

describe('QueryService', () => {
    function createService() {
        const eventStorage = new InMemoryTimetableEventStorage();
        const recurrence = new RecurrenceService();
        const time = new TimeService();
        const query = new QueryService(eventStorage, recurrence, time);
        return { eventStorage, query };
    }

    it('should return empty schedule for empty storage', async () => {
        const { query } = createService();

        const result = await query.getSchedule({
            dateRange: {
                start: new Date('2026-03-01'),
                end: new Date('2026-03-07'),
            },
        });

        expect(result).toHaveLength(0);
    });

    it('should return events in date range', async () => {
        const { eventStorage, query } = createService();

        await eventStorage.create({
            title: 'Test Event',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: null,
            periodId: null,
        });

        const result = await query.getSchedule({
            dateRange: {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-07T23:59:59Z'),
            },
        });

        expect(result).toHaveLength(1);
        expect(result[0].originalEvent.title).toBe('Test Event');
    });

    it('should expand recurring events', async () => {
        const { eventStorage, query } = createService();

        await eventStorage.create({
            title: 'Weekly Lecture',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
            metadata: null,
            courseId: null,
            roomId: null,
            periodId: null,
        });

        const result = await query.getSchedule({
            dateRange: {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-31T23:59:59Z'),
            },
        });

        // Should have ~5 Mondays in March 2026
        expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should find free slots', async () => {
        const { eventStorage, query } = createService();

        // Create event from 9:00 to 10:30
        const event = await eventStorage.create({
            title: 'Morning Event',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: 'room-1',
            periodId: null,
        });

        const freeSlots = await query.findFreeSlots({
            dateRange: {
                start: new Date('2026-03-02T08:00:00Z'),
                end: new Date('2026-03-02T17:00:00Z'),
            },
            durationMin: 30,
            entityIds: [{ type: 'room', id: 'room-1' }],
        });

        // Should have free slots before 9:00 and after 10:30
        expect(freeSlots.length).toBeGreaterThanOrEqual(2);
    });

    it('should get entity schedule', async () => {
        const { eventStorage, query } = createService();

        const event = await eventStorage.create({
            title: 'Room Event',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: 'room-1',
            periodId: null,
        });

        const result = await query.getEntitySchedule('room', 'room-1', {
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-07T23:59:59Z'),
        });

        expect(result).toHaveLength(1);
    });
});
