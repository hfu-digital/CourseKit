import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AvailabilityStorage } from '../interfaces/availability-storage.interface.js';
import { RecurrenceService } from './recurrence.service.js';
import { DOMAIN_EVENTS } from '../interfaces/domain-events.interface.js';
import type {
    Availability, AvailabilityEntityType, DateRange, FreeSlot,
} from '../interfaces/types.js';

@Injectable()
export class AvailabilityService {
    constructor(
        private readonly storage: AvailabilityStorage,
        private readonly recurrence: RecurrenceService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async create(data: Omit<Availability, 'id'>): Promise<Availability> {
        const availability = await this.storage.create(data);
        this.eventEmitter.emit(DOMAIN_EVENTS.AVAILABILITY_CREATED, { availability });
        return availability;
    }

    async update(id: string, data: Partial<Availability>): Promise<Availability> {
        const previous = await this.storage.findById(id);
        if (!previous) {
            throw new Error(`Availability with id ${id} not found`);
        }
        const current = await this.storage.update(id, data);
        this.eventEmitter.emit(DOMAIN_EVENTS.AVAILABILITY_UPDATED, { previous, current });
        return current;
    }

    async delete(id: string): Promise<void> {
        const availability = await this.storage.findById(id);
        if (!availability) {
            throw new Error(`Availability with id ${id} not found`);
        }
        await this.storage.delete(id);
        this.eventEmitter.emit(DOMAIN_EVENTS.AVAILABILITY_DELETED, { availability });
    }

    /**
     * Check if an entity is available at a specific time.
     * Expands recurring availability rules for the given date.
     */
    async isAvailable(
        entityType: AvailabilityEntityType,
        entityId: string,
        start: Date,
        durationMin: number,
    ): Promise<{ available: boolean; conflicts: Availability[] }> {
        const end = new Date(start.getTime() + durationMin * 60_000);
        const dateRange: DateRange = { start, end };

        const rules = await this.storage.findByEntityInRange(entityType, entityId, dateRange);
        const conflicts: Availability[] = [];

        for (const rule of rules) {
            if (this.ruleAppliesAt(rule, start, end)) {
                if (rule.type === 'blocked') {
                    conflicts.push(rule);
                }
            }
        }

        // If there are hard blocks, entity is unavailable
        const hardBlocks = conflicts.filter(c => c.hardness === 'hard');
        if (hardBlocks.length > 0) {
            return { available: false, conflicts: hardBlocks };
        }

        // If there are soft blocks, report them as warnings but still available
        return { available: conflicts.length === 0, conflicts };
    }

    /**
     * Find free slots for an entity within a date range.
     */
    async findFreeSlots(
        entityType: AvailabilityEntityType,
        entityId: string,
        dateRange: DateRange,
        minDurationMin: number,
    ): Promise<FreeSlot[]> {
        const rules = await this.storage.findByEntityInRange(entityType, entityId, dateRange);

        // Collect all blocked intervals
        const blockedIntervals: Array<{ start: Date; end: Date }> = [];
        for (const rule of rules) {
            if (rule.type === 'blocked' && rule.hardness === 'hard') {
                blockedIntervals.push({
                    start: rule.startTime,
                    end: rule.endTime,
                });
            }
        }

        // Sort blocked intervals by start time
        blockedIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

        // Merge overlapping blocked intervals
        const merged = this.mergeIntervals(blockedIntervals);

        // Find gaps between blocked intervals within the date range
        const freeSlots: FreeSlot[] = [];
        let current = dateRange.start;

        for (const blocked of merged) {
            if (current < blocked.start) {
                const gapMin = (blocked.start.getTime() - current.getTime()) / 60_000;
                if (gapMin >= minDurationMin) {
                    freeSlots.push({
                        start: current,
                        end: blocked.start,
                        durationMin: gapMin,
                    });
                }
            }
            if (blocked.end > current) {
                current = blocked.end;
            }
        }

        // Check remaining time after last blocked interval
        if (current < dateRange.end) {
            const gapMin = (dateRange.end.getTime() - current.getTime()) / 60_000;
            if (gapMin >= minDurationMin) {
                freeSlots.push({
                    start: current,
                    end: dateRange.end,
                    durationMin: gapMin,
                });
            }
        }

        return freeSlots;
    }

    private ruleAppliesAt(rule: Availability, start: Date, end: Date): boolean {
        // Check if the rule's time window overlaps with the given interval
        return rule.startTime < end && rule.endTime > start;
    }

    private mergeIntervals(intervals: Array<{ start: Date; end: Date }>): Array<{ start: Date; end: Date }> {
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
