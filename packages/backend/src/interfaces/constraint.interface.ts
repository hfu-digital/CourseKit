import type { TimetableEvent, MaterializedOccurrence, Conflict, DateRange } from './types.js';

/**
 * A constraint rule that the conflict detection engine evaluates.
 * Consumers can register custom constraints alongside built-ins.
 */
export abstract class ScheduleConstraint {
    /** Unique identifier for this constraint type, e.g. "instructor-overlap" */
    abstract readonly type: string;

    /** Human-readable description */
    abstract readonly description: string;

    /**
     * Evaluate whether a set of occurrences violates this constraint.
     * Returns an empty array if no violations found.
     */
    abstract evaluate(
        occurrences: MaterializedOccurrence[],
        context: ConstraintContext,
    ): Promise<Conflict[]>;
}

export interface ConstraintContext {
    dateRange: DateRange;
    allEvents: TimetableEvent[];
    /** Lookup helpers injected by the conflict service */
    getInstructorsForEvent: (eventId: string) => Promise<string[]>;
    getGroupsForEvent: (eventId: string) => Promise<string[]>;
}
