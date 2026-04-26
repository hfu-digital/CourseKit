import { Injectable } from '@nestjs/common';
import { TimetableEventStorage } from '../interfaces/event-storage.interface.js';
import type {
    DateRange,
    FreeSlot,
    FreeSlotQuery,
    MaterializedOccurrence,
    ScheduleQuery,
} from '../interfaces/types.js';
import { RecurrenceService } from './recurrence.service.js';
import { TimeService } from './time.service.js';

@Injectable()
export class QueryService {
    constructor(
        private readonly eventStorage: TimetableEventStorage,
        private readonly recurrence: RecurrenceService,
        private readonly time: TimeService,
    ) {}

    /**
     * Get all materialized occurrences matching a query.
     * Expands recurring events, applies exceptions, filters by entities.
     */
    async getSchedule(query: ScheduleQuery): Promise<MaterializedOccurrence[]> {
        const events = await this.eventStorage.findByQuery(query);
        const allOccurrences: MaterializedOccurrence[] = [];

        for (const event of events) {
            const exceptions = await this.eventStorage.findExceptions(event.id);
            const occurrences = this.recurrence.materialize(event, exceptions, query.dateRange);
            allOccurrences.push(...occurrences);
        }

        // Sort by start time
        allOccurrences.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return allOccurrences;
    }

    /**
     * Find time slots where ALL specified entities are free.
     */
    async findFreeSlots(query: FreeSlotQuery): Promise<FreeSlot[]> {
        // Collect all occupied intervals for the specified entities
        const occupiedIntervals: Array<{ start: Date; end: Date }> = [];

        for (const entity of query.entityIds) {
            const entityQuery: ScheduleQuery = {
                dateRange: query.dateRange,
                ...(entity.type === 'instructor' ? { instructorIds: [entity.id] } : {}),
                ...(entity.type === 'room' ? { roomIds: [entity.id] } : {}),
                ...(entity.type === 'group' ? { groupIds: [entity.id] } : {}),
            };

            const events = await this.eventStorage.findByQuery(entityQuery);
            for (const event of events) {
                const exceptions = await this.eventStorage.findExceptions(event.id);
                const occurrences = this.recurrence.materialize(event, exceptions, query.dateRange);
                for (const occ of occurrences) {
                    occupiedIntervals.push({
                        start: occ.startTime,
                        end: this.time.endTime(occ.startTime, occ.durationMin),
                    });
                }
            }
        }

        // Sort and merge occupied intervals
        occupiedIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());
        const merged = this.mergeIntervals(occupiedIntervals);

        // Find gaps that are at least durationMin long
        const freeSlots: FreeSlot[] = [];
        let current = query.dateRange.start;

        for (const occupied of merged) {
            if (current < occupied.start) {
                const gapMin = this.time.gapMinutes(current, occupied.start);
                if (gapMin >= query.durationMin) {
                    freeSlots.push({
                        start: current,
                        end: occupied.start,
                        durationMin: gapMin,
                    });
                }
            }
            if (occupied.end > current) {
                current = occupied.end;
            }
        }

        // Check remaining time after last occupied interval
        if (current < query.dateRange.end) {
            const gapMin = this.time.gapMinutes(current, query.dateRange.end);
            if (gapMin >= query.durationMin) {
                freeSlots.push({
                    start: current,
                    end: query.dateRange.end,
                    durationMin: gapMin,
                });
            }
        }

        return freeSlots;
    }

    /**
     * Get schedule for a specific entity (convenience wrapper).
     */
    async getEntitySchedule(
        entityType: 'instructor' | 'room' | 'group',
        entityId: string,
        dateRange: DateRange,
    ): Promise<MaterializedOccurrence[]> {
        const query: ScheduleQuery = {
            dateRange,
            ...(entityType === 'instructor' ? { instructorIds: [entityId] } : {}),
            ...(entityType === 'room' ? { roomIds: [entityId] } : {}),
            ...(entityType === 'group' ? { groupIds: [entityId] } : {}),
        };

        return this.getSchedule(query);
    }

    private mergeIntervals(
        intervals: Array<{ start: Date; end: Date }>,
    ): Array<{ start: Date; end: Date }> {
        if (intervals.length === 0) return [];

        const result: Array<{ start: Date; end: Date }> = [{ ...intervals[0] }];

        for (let i = 1; i < intervals.length; i++) {
            const last = result[result.length - 1];
            const curr = intervals[i];

            if (curr.start <= last.end) {
                last.end = curr.end > last.end ? curr.end : last.end;
            } else {
                result.push({ ...curr });
            }
        }

        return result;
    }
}
