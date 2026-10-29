import { beforeEach, describe, expect, it } from 'bun:test';
import { AvailabilityService } from '../domain/availability.service.js';
import { RecurrenceService } from '../domain/recurrence.service.js';
import { EntityNotFoundError } from '../errors/index.js';
import { EventSpy } from '../testing/event-spy.js';
import { InMemoryAvailabilityStorage } from '../testing/memory-availability-storage.adapter.js';

describe('AvailabilityService', () => {
    let service: AvailabilityService;
    let storage: InMemoryAvailabilityStorage;
    let spy: EventSpy;

    beforeEach(() => {
        storage = new InMemoryAvailabilityStorage();
        const recurrence = new RecurrenceService();
        spy = new EventSpy();
        const emitter = spy.createMockEmitter();
        service = new AvailabilityService(storage, recurrence, emitter as any);
    });

    describe('CRUD', () => {
        it('should create an availability rule', async () => {
            const result = await service.create({
                entityType: 'instructor',
                entityId: 'instructor-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T08:00:00Z'),
                endTime: new Date('2026-03-02T17:00:00Z'),
                type: 'available',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });

            expect(result.id).toBeDefined();
            expect(result.entityType).toBe('instructor');
            expect(spy.wasEmitted('coursekit.availability.created')).toBe(true);
        });

        it('should update an availability rule', async () => {
            const created = await service.create({
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T08:00:00Z'),
                endTime: new Date('2026-03-02T12:00:00Z'),
                type: 'blocked',
                hardness: 'soft',
                priority: 0,
                recurrenceRule: null,
            });

            const updated = await service.update(created.id, {
                hardness: 'hard',
            });

            expect(updated.hardness).toBe('hard');
            expect(spy.wasEmitted('coursekit.availability.updated')).toBe(true);
        });

        it('should delete an availability rule', async () => {
            const created = await service.create({
                entityType: 'instructor',
                entityId: 'instructor-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T08:00:00Z'),
                endTime: new Date('2026-03-02T17:00:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });

            await service.delete(created.id);
            expect(spy.wasEmitted('coursekit.availability.deleted')).toBe(true);
        });

        it('should throw EntityNotFoundError when updating non-existent rule', async () => {
            try {
                await service.update('nonexistent', { hardness: 'soft' });
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeInstanceOf(EntityNotFoundError);
                expect((error as EntityNotFoundError).entityType).toBe('Availability');
                expect((error as EntityNotFoundError).entityId).toBe('nonexistent');
            }
        });

        it('should throw EntityNotFoundError when deleting non-existent rule', async () => {
            try {
                await service.delete('nonexistent');
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeInstanceOf(EntityNotFoundError);
                expect((error as EntityNotFoundError).entityType).toBe('Availability');
            }
        });
    });

    describe('isAvailable', () => {
        it('should return available when no blocks exist', async () => {
            const result = await service.isAvailable(
                'instructor',
                'instructor-1',
                new Date('2026-03-02T09:00:00Z'),
                60,
            );

            expect(result.available).toBe(true);
            expect(result.conflicts).toHaveLength(0);
        });

        it('should return unavailable for hard block overlap', async () => {
            await storage.create({
                entityType: 'instructor',
                entityId: 'instructor-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T09:00:00Z'),
                endTime: new Date('2026-03-02T12:00:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });

            const result = await service.isAvailable(
                'instructor',
                'instructor-1',
                new Date('2026-03-02T10:00:00Z'),
                60,
            );

            expect(result.available).toBe(false);
            expect(result.conflicts.length).toBeGreaterThan(0);
        });

        it('should report soft blocks as warnings', async () => {
            await storage.create({
                entityType: 'instructor',
                entityId: 'instructor-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T09:00:00Z'),
                endTime: new Date('2026-03-02T12:00:00Z'),
                type: 'blocked',
                hardness: 'soft',
                priority: 0,
                recurrenceRule: null,
            });

            const result = await service.isAvailable(
                'instructor',
                'instructor-1',
                new Date('2026-03-02T10:00:00Z'),
                60,
            );

            // Soft blocks make entity unavailable but are reported differently than hard blocks
            expect(result.available).toBe(false);
            expect(result.conflicts.length).toBeGreaterThan(0);
            expect(result.conflicts[0].hardness).toBe('soft');
        });

        it('should return available when block does not overlap', async () => {
            await storage.create({
                entityType: 'instructor',
                entityId: 'instructor-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T14:00:00Z'),
                endTime: new Date('2026-03-02T16:00:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });

            const result = await service.isAvailable(
                'instructor',
                'instructor-1',
                new Date('2026-03-02T09:00:00Z'),
                60,
            );

            expect(result.available).toBe(true);
            expect(result.conflicts).toHaveLength(0);
        });
    });

    describe('findFreeSlots', () => {
        it('should find free slots around blocked intervals', async () => {
            await storage.create({
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T10:00:00Z'),
                endTime: new Date('2026-03-02T12:00:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });

            const slots = await service.findFreeSlots(
                'room',
                'room-1',
                { start: new Date('2026-03-02T08:00:00Z'), end: new Date('2026-03-02T16:00:00Z') },
                30,
            );

            expect(slots.length).toBe(2);
            // 8:00–10:00 (120 min) and 12:00–16:00 (240 min)
            expect(slots[0].durationMin).toBe(120);
            expect(slots[1].durationMin).toBe(240);
        });

        it('should return entire range when no blocks exist', async () => {
            const slots = await service.findFreeSlots(
                'room',
                'room-1',
                { start: new Date('2026-03-02T08:00:00Z'), end: new Date('2026-03-02T16:00:00Z') },
                30,
            );

            expect(slots.length).toBe(1);
            expect(slots[0].durationMin).toBe(480); // 8 hours
        });

        it('should respect minimum duration filter', async () => {
            await storage.create({
                entityType: 'room',
                entityId: 'room-1',
                dayOfWeek: null,
                specificDate: null,
                startTime: new Date('2026-03-02T09:00:00Z'),
                endTime: new Date('2026-03-02T09:15:00Z'),
                type: 'blocked',
                hardness: 'hard',
                priority: 0,
                recurrenceRule: null,
            });

            // Ask for slots at least 120 minutes
            const slots = await service.findFreeSlots(
                'room',
                'room-1',
                { start: new Date('2026-03-02T08:00:00Z'), end: new Date('2026-03-02T16:00:00Z') },
                120,
            );

            // The 8:00-9:00 gap is only 60 min, should be excluded
            expect(slots.every((s) => s.durationMin >= 120)).toBe(true);
        });
    });
});
