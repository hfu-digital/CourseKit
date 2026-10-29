import { Injectable } from '@nestjs/common';
import type { RRule as RRuleType } from 'rrule';
import * as rruleModule from 'rrule';

// CJS/ESM interop: rrule is a UMD bundle without an exports map,
// so Node.js ESM can't resolve named exports directly
const rruleNs = (
    'default' in rruleModule ? (rruleModule as any).default : rruleModule
) as typeof rruleModule;
const { RRule, RRuleSet, rrulestr } = rruleNs;

// Public queries and imported RRULEs must have finite work and output budgets.
const MAX_RANGE_MS = 3660 * 86_400_000;
const MAX_OCCURRENCES = 10_000;
const MAX_RULE_WORK = 100_000;

import type {
    DateRange,
    EventException,
    MaterializedOccurrence,
    TimetableEvent,
} from '../interfaces/types.js';

@Injectable()
export class RecurrenceService {
    /**
     * Parse an RRULE string into an RRule instance.
     * Throws if the string is invalid.
     */
    parseRule(rruleString: string, dtstart: Date): RRuleType {
        if (rruleString.length > 4096 || !Number.isFinite(dtstart.getTime())) {
            throw new RangeError('Invalid or oversized recurrence rule');
        }
        const options = RRule.parseString(rruleString);
        if (options.interval !== undefined && (!Number.isInteger(options.interval) || options.interval < 1)) {
            throw new RangeError('Recurrence interval must be a positive integer');
        }
        options.dtstart = dtstart;
        return new RRule(options);
    }

    /**
     * Validate an RRULE string. Returns null if valid, error message if invalid.
     */
    validateRule(rruleString: string): string | null {
        try {
            this.parseRule(rruleString, new Date(0));
            return null;
        } catch (error) {
            return error instanceof Error ? error.message : 'Invalid RRULE string';
        }
    }

    /**
     * Materialize a recurring event into concrete occurrences for a date range.
     * Applies exceptions (cancellations, modifications, additions).
     */
    materialize(
        event: TimetableEvent,
        exceptions: EventException[],
        dateRange: DateRange,
    ): MaterializedOccurrence[] {
        this.validateRange(dateRange);
        if (exceptions.length > MAX_OCCURRENCES) throw new RangeError('Too many recurrence exceptions');
        if (!event.recurrenceRule) {
            const single = this.materializeSingle(event, dateRange);
            return single ? [single] : [];
        }

        const rruleSet = new RRuleSet();

        // Parse the main RRULE with event's start time as dtstart
        const rule = this.parseRule(event.recurrenceRule, event.startTime);
        // rrule iterates from DTSTART, even for narrow queries far in the future.
        // Bound estimated iterations and the per-iteration time-set expansion
        // before asking it to materialize anything, including rules with no matches.
        const span = Math.max(0, dateRange.end.getTime() - event.startTime.getTime());
        const units = [365 * 86_400_000, 28 * 86_400_000, 7 * 86_400_000, 86_400_000, 3_600_000, 60_000, 1000];
        const options = rule.options;
        const unit = units[options.freq];
        const timeSetSize = Math.max(1, options.byhour?.length ?? 1)
            * Math.max(1, options.byminute?.length ?? 1)
            * Math.max(1, options.bysecond?.length ?? 1);
        if (!unit || span > MAX_RANGE_MS || (Math.ceil(span / unit / options.interval) + 1) * timeSetSize > MAX_RULE_WORK) {
            throw new RangeError('Recurrence expansion exceeds work budget');
        }
        rruleSet.rrule(rule);

        // Apply cancelled exceptions as EXDATEs
        const cancelledDates = new Set<number>();
        const modifiedMap = new Map<number, EventException>();
        const addedExceptions: EventException[] = [];

        for (const exception of exceptions) {
            switch (exception.type) {
                case 'cancelled':
                    rruleSet.exdate(exception.originalDate);
                    cancelledDates.add(exception.originalDate.getTime());
                    break;
                case 'modified':
                    modifiedMap.set(exception.originalDate.getTime(), exception);
                    break;
                case 'added':
                    addedExceptions.push(exception);
                    break;
            }
        }

        // Get all occurrence dates in the range
        const dates = rruleSet.between(dateRange.start, dateRange.end, true, (_date, index) => {
            if (index >= MAX_OCCURRENCES) throw new RangeError('Too many recurrence occurrences');
            return true;
        });
        const occurrences: MaterializedOccurrence[] = [];

        for (const date of dates) {
            const dateKey = date.getTime();
            const modification = modifiedMap.get(dateKey);

            if (modification) {
                // Modified occurrence
                occurrences.push({
                    eventId: event.id,
                    occurrenceDate: date,
                    startTime: modification.newStartTime ?? date,
                    durationMin: modification.newDurationMin ?? event.durationMin,
                    roomId: modification.newRoomId ?? event.roomId,
                    metadata: modification.metadata ?? event.metadata,
                    isException: true,
                    exceptionType: 'modified',
                    originalEvent: event,
                });
            } else {
                // Normal occurrence
                occurrences.push({
                    eventId: event.id,
                    occurrenceDate: date,
                    startTime: date,
                    durationMin: event.durationMin,
                    roomId: event.roomId,
                    metadata: event.metadata,
                    isException: false,
                    exceptionType: null,
                    originalEvent: event,
                });
            }
        }

        // Add "added" exceptions that fall within the date range
        for (const exception of addedExceptions) {
            const exDate = exception.originalDate;
            if (exDate >= dateRange.start && exDate <= dateRange.end) {
                if (occurrences.length >= MAX_OCCURRENCES) throw new RangeError('Too many recurrence occurrences');
                occurrences.push({
                    eventId: event.id,
                    occurrenceDate: exDate,
                    startTime: exception.newStartTime ?? exDate,
                    durationMin: exception.newDurationMin ?? event.durationMin,
                    roomId: exception.newRoomId ?? event.roomId,
                    metadata: exception.metadata ?? event.metadata,
                    isException: true,
                    exceptionType: 'added',
                    originalEvent: event,
                });
            }
        }

        // Sort by start time
        occurrences.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return occurrences;
    }

    /**
     * For a non-recurring event, return a single occurrence if it falls in the range.
     */
    materializeSingle(event: TimetableEvent, dateRange: DateRange): MaterializedOccurrence | null {
        this.validateRange(dateRange);
        const eventEnd = new Date(event.startTime.getTime() + event.durationMin * 60_000);

        // Event overlaps with date range if it starts before range ends AND ends after range starts
        if (event.startTime <= dateRange.end && eventEnd >= dateRange.start) {
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

        return null;
    }

    private validateRange(range: DateRange): void {
        const start = range.start.getTime();
        const end = range.end.getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > MAX_RANGE_MS) {
            throw new RangeError('Recurrence range must be valid, ordered and at most 3660 days');
        }
    }
}
