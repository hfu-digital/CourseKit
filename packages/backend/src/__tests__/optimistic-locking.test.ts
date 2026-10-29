import { beforeEach, describe, expect, it } from 'bun:test';
import { VersionConflictError } from '../errors/index.js';
import { InMemoryAvailabilityStorage } from '../testing/memory-availability-storage.adapter.js';
import { InMemoryTimetableEventStorage } from '../testing/memory-event-storage.adapter.js';
import { InMemoryLocationDistanceStorage } from '../testing/memory-location-distance-storage.adapter.js';

describe('Optimistic locking', () => {
    describe('TimetableEventStorage.update', () => {
        let storage: InMemoryTimetableEventStorage;

        beforeEach(() => {
            storage = new InMemoryTimetableEventStorage();
        });

        it('rejects updates with a stale expectedVersion', async () => {
            const event = await storage.create({
                title: 'X',
                startTime: new Date('2026-04-26T08:00:00Z'),
                durationMin: 90,
                recurrenceRule: null,
                metadata: null,
                courseId: null,
                roomId: null,
                periodId: null,
            });
            await storage.update(event.id, { title: 'Y' }, 0);
            try {
                await storage.update(event.id, { title: 'Z' }, 0);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(VersionConflictError);
            }
        });
    });

    describe('AvailabilityStorage.update', () => {
        let storage: InMemoryAvailabilityStorage;

        beforeEach(() => {
            storage = new InMemoryAvailabilityStorage();
        });

        it('initializes version to 0 on create', async () => {
            const a = await storage.create({
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-04-26T08:00:00Z'),
                endTime: new Date('2026-04-26T09:30:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });
            expect(a.version).toBe(0);
        });

        it('rejects stale expectedVersion', async () => {
            const a = await storage.create({
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-04-26T08:00:00Z'),
                endTime: new Date('2026-04-26T09:30:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });
            await storage.update(a.id, { hardness: 'soft' }, 0);
            try {
                await storage.update(a.id, { hardness: 'hard' }, 0);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(VersionConflictError);
                expect((err as VersionConflictError).entityType).toBe('Availability');
                expect((err as VersionConflictError).expectedVersion).toBe(0);
                expect((err as VersionConflictError).actualVersion).toBe(1);
            }
        });

        it('accepts updates without expectedVersion (legacy callers)', async () => {
            const a = await storage.create({
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-04-26T08:00:00Z'),
                endTime: new Date('2026-04-26T09:30:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });
            const updated = await storage.update(a.id, { priority: 5 });
            expect(updated.priority).toBe(5);
            expect(updated.version).toBe(1);
        });
    });

    describe('LocationDistanceStorage.update', () => {
        let storage: InMemoryLocationDistanceStorage;

        beforeEach(() => {
            storage = new InMemoryLocationDistanceStorage();
        });

        it('rejects stale expectedVersion', async () => {
            const ld = await storage.create({
                fromCampus: 'A',
                toCampus: 'B',
                travelMinutes: 15,
            });
            await storage.update(ld.id, { travelMinutes: 20 }, 0);
            try {
                await storage.update(ld.id, { travelMinutes: 25 }, 0);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(VersionConflictError);
            }
        });
    });

    describe('TimetableEventStorage.updateException', () => {
        let storage: InMemoryTimetableEventStorage;

        beforeEach(() => {
            storage = new InMemoryTimetableEventStorage();
        });

        it('rejects stale expectedVersion on exception updates', async () => {
            const event = await storage.create({
                title: 'X',
                startTime: new Date('2026-04-26T08:00:00Z'),
                durationMin: 90,
                recurrenceRule: null,
                metadata: null,
                courseId: null,
                roomId: null,
                periodId: null,
            });
            const exception = await storage.createException({
                eventId: event.id,
                originalDate: new Date('2026-05-03T00:00:00Z'),
                type: 'cancelled',
                newStartTime: null,
                newDurationMin: null,
                newRoomId: null,
                metadata: null,
            });
            await storage.updateException(exception.id, { type: 'modified' }, 0);
            try {
                await storage.updateException(exception.id, { type: 'cancelled' }, 0);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(VersionConflictError);
                expect((err as VersionConflictError).entityType).toBe('EventException');
            }
        });
    });
});
