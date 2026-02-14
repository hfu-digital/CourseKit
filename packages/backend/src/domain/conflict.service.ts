import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimetableEventStorage } from '../interfaces/event-storage.interface.js';
import { TimeService } from './time.service.js';
import { AvailabilityService } from './availability.service.js';
import { RecurrenceService } from './recurrence.service.js';
import { DOMAIN_EVENTS } from '../interfaces/domain-events.interface.js';
import type { ScheduleConstraint, ConstraintContext } from '../interfaces/constraint.interface.js';
import type {
    TimetableEvent, ConflictCheckResult, DateRange, MaterializedOccurrence, Conflict,
} from '../interfaces/types.js';

@Injectable()
export class ConflictService {
    constructor(
        private readonly time: TimeService,
        private readonly availability: AvailabilityService,
        private readonly eventStorage: TimetableEventStorage,
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
        for (const ev of allEvents) {
            const exceptions = await this.eventStorage.findExceptions(ev.id);
            const occurrences = this.recurrence.materialize(ev, exceptions, dateRange);
            allOccurrences.push(...occurrences);
        }

        // Build the constraint context
        const context: ConstraintContext = {
            dateRange,
            allEvents,
            getInstructorsForEvent: async (eventId: string) => {
                const instructors = await this.eventStorage.findInstructors(eventId);
                return instructors.map(i => i.instructorId);
            },
            getGroupsForEvent: async (eventId: string) => {
                const groups = await this.eventStorage.findGroups(eventId);
                return groups.map(g => g.groupId);
            },
        };

        // Evaluate all constraints
        const allConflicts: Conflict[] = [];
        for (const constraint of this.constraints) {
            const conflicts = await constraint.evaluate(allOccurrences, context);
            allConflicts.push(...conflicts);
        }

        const result: ConflictCheckResult = {
            hasErrors: allConflicts.some(c => c.severity === 'error'),
            hasWarnings: allConflicts.some(c => c.severity === 'warning'),
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
        for (const ev of allEvents) {
            if (ev.id === tempEvent.id) {
                // For the proposed event, materialize without exceptions
                const occurrences = this.recurrence.materialize(ev, [], dateRange);
                allOccurrences.push(...occurrences);
            } else {
                const exceptions = await this.eventStorage.findExceptions(ev.id);
                const occurrences = this.recurrence.materialize(ev, exceptions, dateRange);
                allOccurrences.push(...occurrences);
            }
        }

        // Build the constraint context
        const context: ConstraintContext = {
            dateRange,
            allEvents,
            getInstructorsForEvent: async (eventId: string) => {
                if (eventId === tempEvent.id) return [];
                const instructors = await this.eventStorage.findInstructors(eventId);
                return instructors.map(i => i.instructorId);
            },
            getGroupsForEvent: async (eventId: string) => {
                if (eventId === tempEvent.id) return [];
                const groups = await this.eventStorage.findGroups(eventId);
                return groups.map(g => g.groupId);
            },
        };

        // Evaluate all constraints
        const allConflicts: Conflict[] = [];
        for (const constraint of this.constraints) {
            const conflicts = await constraint.evaluate(allOccurrences, context);
            allConflicts.push(...conflicts);
        }

        return {
            hasErrors: allConflicts.some(c => c.severity === 'error'),
            hasWarnings: allConflicts.some(c => c.severity === 'warning'),
            conflicts: allConflicts,
        };
    }
}
