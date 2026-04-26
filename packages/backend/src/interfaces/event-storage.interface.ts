import type {
    EventException,
    EventGroup,
    EventInstructor,
    ScheduleQuery,
    TimetableEvent,
} from './types.js';

export abstract class TimetableEventStorage {
    abstract create(
        data: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
    ): Promise<TimetableEvent>;
    abstract findById(id: string): Promise<TimetableEvent | null>;
    abstract findByQuery(query: ScheduleQuery): Promise<TimetableEvent[]>;
    abstract update(
        id: string,
        data: Partial<TimetableEvent>,
        expectedVersion?: number,
    ): Promise<TimetableEvent>;
    abstract delete(id: string): Promise<void>;

    // Exception management
    abstract createException(data: Omit<EventException, 'id'>): Promise<EventException>;
    abstract findExceptions(eventId: string): Promise<EventException[]>;
    abstract updateException(
        id: string,
        data: Partial<EventException>,
        expectedVersion?: number,
    ): Promise<EventException>;
    abstract deleteException(id: string): Promise<void>;

    // Instructor/Group associations
    abstract addInstructor(data: Omit<EventInstructor, 'id'>): Promise<EventInstructor>;
    abstract removeInstructor(eventId: string, instructorId: string): Promise<void>;
    abstract findInstructors(eventId: string): Promise<EventInstructor[]>;

    abstract addGroup(data: Omit<EventGroup, 'id'>): Promise<EventGroup>;
    abstract removeGroup(eventId: string, groupId: string): Promise<void>;
    abstract findGroups(eventId: string): Promise<EventGroup[]>;
}
