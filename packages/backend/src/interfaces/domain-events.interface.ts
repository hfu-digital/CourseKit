import type { Availability, ConflictCheckResult, EventException, TimetableEvent } from './types.js';

// ─── Event Names (constants for type safety) ────────────────
export const DOMAIN_EVENTS = {
    EVENT_CREATED: 'coursekit.event.created',
    EVENT_UPDATED: 'coursekit.event.updated',
    EVENT_DELETED: 'coursekit.event.deleted',
    EXCEPTION_CREATED: 'coursekit.exception.created',
    EXCEPTION_DELETED: 'coursekit.exception.deleted',
    CONFLICT_DETECTED: 'coursekit.conflict.detected',
    AVAILABILITY_CREATED: 'coursekit.availability.created',
    AVAILABILITY_UPDATED: 'coursekit.availability.updated',
    AVAILABILITY_DELETED: 'coursekit.availability.deleted',
} as const;

// ─── Payload Types ───────────────────────────────────────────
export interface EventCreatedPayload {
    event: TimetableEvent;
}

export interface EventUpdatedPayload {
    previous: TimetableEvent;
    current: TimetableEvent;
    changedFields: string[];
}

export interface EventDeletedPayload {
    event: TimetableEvent;
}

export interface ExceptionCreatedPayload {
    exception: EventException;
    parentEvent: TimetableEvent;
}

export interface ExceptionDeletedPayload {
    exception: EventException;
    parentEvent: TimetableEvent;
}

export interface ConflictDetectedPayload {
    result: ConflictCheckResult;
    triggeringEventId: string;
}

export interface AvailabilityCreatedPayload {
    availability: Availability;
}

export interface AvailabilityUpdatedPayload {
    previous: Availability;
    current: Availability;
}

export interface AvailabilityDeletedPayload {
    availability: Availability;
}

// ─── Union Map (for typed subscribers) ──────────────────────
export interface DomainEventMap {
    [DOMAIN_EVENTS.EVENT_CREATED]: EventCreatedPayload;
    [DOMAIN_EVENTS.EVENT_UPDATED]: EventUpdatedPayload;
    [DOMAIN_EVENTS.EVENT_DELETED]: EventDeletedPayload;
    [DOMAIN_EVENTS.EXCEPTION_CREATED]: ExceptionCreatedPayload;
    [DOMAIN_EVENTS.EXCEPTION_DELETED]: ExceptionDeletedPayload;
    [DOMAIN_EVENTS.CONFLICT_DETECTED]: ConflictDetectedPayload;
    [DOMAIN_EVENTS.AVAILABILITY_CREATED]: AvailabilityCreatedPayload;
    [DOMAIN_EVENTS.AVAILABILITY_UPDATED]: AvailabilityUpdatedPayload;
    [DOMAIN_EVENTS.AVAILABILITY_DELETED]: AvailabilityDeletedPayload;
}
