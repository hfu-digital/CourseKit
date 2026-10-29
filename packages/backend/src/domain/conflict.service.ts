import { readBatch, byKey } from './batch.js';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ConstraintContext, ScheduleConstraint } from '../interfaces/constraint.interface.js';
import { DOMAIN_EVENTS } from '../interfaces/domain-events.interface.js';
import { TimetableEventStorage } from '../interfaces/event-storage.interface.js';
import { GroupStorage } from '../interfaces/group-storage.interface.js';
import { RoomStorage } from '../interfaces/room-storage.interface.js';
import type {
    Conflict,
    ConflictCheckResult,
    DateRange,
    MaterializedOccurrence,
    TimetableEvent,
} from '../interfaces/types.js';
import { AvailabilityService } from './availability.service.js';
import { RecurrenceService } from './recurrence.service.js';
import { TimeService } from './time.service.js';

@Injectable()
export class ConflictService {
    constructor(
        private readonly time: TimeService,
        private readonly availability: AvailabilityService,
        private readonly eventStorage: TimetableEventStorage,
        private readonly roomStorage: RoomStorage,
        private readonly groupStorage: GroupStorage,
        private readonly recurrence: RecurrenceService,
        private readonly eventEmitter: EventEmitter2,
        @Inject('SCHEDULE_CONSTRAINTS') private readonly constraints: ScheduleConstraint[],
    ) {}

    /**
     * Check a single event (or proposed event) against all registered constraints.
     * Materializes recurring events in the relevant date range.
     */
    async check(event: TimetableEvent, dateRange: DateRange): Promise<ConflictCheckResult> {
        // Get all events in the date range
        const allEvents = await this.eventStorage.findByQuery({ dateRange });

        // Materialize all events into occurrences
        const allOccurrences: MaterializedOccurrence[] = [];
        const exceptionMap = byKey(await readBatch(allEvents.map(e => e.id), this.eventStorage.findExceptionsBatch?.bind(this.eventStorage), id => this.eventStorage.findExceptions(id)), e => e.eventId);
        for (const ev of allEvents) {
            const exceptions = exceptionMap.get(ev.id) ?? [];
            const occurrences = this.recurrence.materialize(ev, exceptions, dateRange);
            allOccurrences.push(...occurrences);
        }

        // Build the constraint context
        const context = this.buildContext(dateRange, allEvents, allOccurrences);

        // Evaluate all constraints
        const allConflicts: Conflict[] = [];
        for (const constraint of this.constraints) {
            const conflicts = await constraint.evaluate(allOccurrences, context);
            allConflicts.push(...conflicts);
        }

        const result: ConflictCheckResult = {
            hasErrors: allConflicts.some((c) => c.severity === 'error'),
            hasWarnings: allConflicts.some((c) => c.severity === 'warning'),
            conflicts: allConflicts,
        };

        if (allConflicts.length > 0) {
            this.eventEmitter.emit(DOMAIN_EVENTS.CONFLICT_DETECTED, {
                result,
                triggeringEventId: event.id,
            });
        }

        return result;
    }

    /**
     * Dry-run: check what conflicts a mutation would create without applying it.
     */
    async dryRun(
        proposedEvent: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
        dateRange: DateRange,
    ): Promise<ConflictCheckResult> {
        // Create a temporary event object for evaluation
        const tempEvent: TimetableEvent = {
            ...proposedEvent,
            id: `__dry_run_${Date.now()}`,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Get all existing events in the date range
        const allEvents = await this.eventStorage.findByQuery({ dateRange });
        allEvents.push(tempEvent);

        // Materialize all events into occurrences
        const allOccurrences: MaterializedOccurrence[] = [];
        const exceptionMap = byKey(await readBatch(allEvents.filter(e => e.id !== tempEvent.id).map(e => e.id), this.eventStorage.findExceptionsBatch?.bind(this.eventStorage), id => this.eventStorage.findExceptions(id)), e => e.eventId);
        for (const ev of allEvents) {
            if (ev.id === tempEvent.id) {
                // For the proposed event, materialize without exceptions
                const occurrences = this.recurrence.materialize(ev, [], dateRange);
                allOccurrences.push(...occurrences);
            } else {
                const exceptions = exceptionMap.get(ev.id) ?? [];
                const occurrences = this.recurrence.materialize(ev, exceptions, dateRange);
                allOccurrences.push(...occurrences);
            }
        }

        // Build the constraint context (with dry-run overrides for the temp event)
        const baseContext = this.buildContext(dateRange, allEvents, allOccurrences, tempEvent.id);
        const context: ConstraintContext = {
            ...baseContext,
            getInstructorsForEvent: async (eventId: string) => {
                if (eventId === tempEvent.id) return [];
                return baseContext.getInstructorsForEvent(eventId);
            },
            getGroupsForEvent: async (eventId: string) => {
                if (eventId === tempEvent.id) return [];
                return baseContext.getGroupsForEvent(eventId);
            },
        };

        // Evaluate all constraints
        const allConflicts: Conflict[] = [];
        for (const constraint of this.constraints) {
            const conflicts = await constraint.evaluate(allOccurrences, context);
            allConflicts.push(...conflicts);
        }

        return {
            hasErrors: allConflicts.some((c) => c.severity === 'error'),
            hasWarnings: allConflicts.some((c) => c.severity === 'warning'),
            conflicts: allConflicts,
        };
    }

    private buildContext(dateRange: DateRange, allEvents: TimetableEvent[], occurrences: MaterializedOccurrence[], excludedEventId?: string): ConstraintContext {
        let isAvailable: ReturnType<AvailabilityService['createChecker']> | undefined;
        const ids = allEvents.map(e => e.id).filter(id => id !== excludedEventId);
        let instructors: Promise<Map<string, import('../interfaces/types.js').EventInstructor[]>> | undefined;
        let groups: Promise<Map<string, import('../interfaces/types.js').EventGroup[]>> | undefined;
        let rooms: Promise<Map<string, import('../interfaces/types.js').Room | null>> | undefined;
        let counts: Promise<Map<string, import('../interfaces/types.js').StudentGroup[]>> | undefined;
        return {
            dateRange,
            allEvents,
            getInstructorsForEvent: async (eventId: string) => {
                instructors ??= readBatch(ids, this.eventStorage.findInstructorsBatch?.bind(this.eventStorage), id => this.eventStorage.findInstructors(id)).then(rows => byKey(rows, r => r.eventId));
                return ((await instructors).get(eventId) ?? []).map(i => i.instructorId);
            },
            getGroupsForEvent: async (eventId: string) => {
                groups ??= readBatch(ids, this.eventStorage.findGroupsBatch?.bind(this.eventStorage), id => this.eventStorage.findGroups(id)).then(rows => byKey(rows, r => r.eventId));
                return ((await groups).get(eventId) ?? []).map(g => g.groupId);
            },
            getRoomById: async (roomId: string) => {
                rooms ??= readBatch([...new Set([...occurrences.map(e => e.roomId).filter((id): id is string => !!id), roomId])], this.roomStorage.findByIds?.bind(this.roomStorage), async id => { const room = await this.roomStorage.findById(id); return room ? [room] : []; }).then(rows => new Map(rows.map(r => [r.id, r])));
                const map = await rooms;
                // Modified recurrence exceptions can introduce rooms absent on the base events.
                if (!map.has(roomId)) { const room = await this.roomStorage.findById(roomId); map.set(roomId, room); }
                return map.get(roomId) ?? null;
            },
            getGroupStudentCount: async (groupId: string) => {
                groups ??= readBatch(ids, this.eventStorage.findGroupsBatch?.bind(this.eventStorage), id => this.eventStorage.findGroups(id)).then(rows => byKey(rows, r => r.eventId));
                counts ??= groups.then(map => readBatch([...map.values()].flat().map(g => g.groupId), this.groupStorage.findStudentsBatch?.bind(this.groupStorage), id => this.groupStorage.findStudents(id))).then(rows => byKey(rows, r => r.groupId));
                return (await counts).get(groupId)?.length ?? 0;
            },
            isEntityAvailable: async (entityType, entityId, start, durationMin) => {
                if (!isAvailable) {
                    instructors ??= readBatch(ids, this.eventStorage.findInstructorsBatch?.bind(this.eventStorage), id => this.eventStorage.findInstructors(id)).then(rows => byKey(rows, r => r.eventId));
                    const entities = [
                        ...occurrences.filter(o => o.roomId).map(o => ({ entityType: 'room' as const, entityId: o.roomId! })),
                        ...[...(await instructors).values()].flat().map(i => ({ entityType: 'instructor' as const, entityId: i.instructorId })),
                    ];
                    isAvailable = this.availability.createChecker(entities);
                }
                return isAvailable(entityType, entityId, start, durationMin);
            },
        };
    }
}
