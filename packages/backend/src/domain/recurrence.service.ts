import { Injectable } from '@nestjs/common';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { TimetableEvent, EventException, MaterializedOccurrence, DateRange } from '../interfaces/types.js';

@Injectable()
export class RecurrenceService {
    /**
     * Parse an RRULE string into an RRule instance.
     * Throws if the string is invalid.
     */
    parseRule(rruleString: string, dtstart: Date): RRule {
        const options = RRule.parseString(rruleString);
        options.dtstart = dtstart;
        return new RRule(options);
    }

    /**
     * Validate an RRULE string. Returns null if valid, error message if invalid.
     */
    validateRule(rruleString: string): string | null {
        try {
            RRule.parseString(rruleString);
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
        if (!event.recurrenceRule) {
            const single = this.materializeSingle(event, dateRange);
            return single ? [single] : [];
        }

        const rruleSet = new RRuleSet();

        // Parse the main RRULE with event's start time as dtstart
        const rule = this.parseRule(event.recurrenceRule, event.startTime);
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
        const dates = rruleSet.between(dateRange.start, dateRange.end, true);
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
    materializeSingle(
        event: TimetableEvent,
        dateRange: DateRange,
    ): MaterializedOccurrence | null {
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
}
