import { TimetableEventStorage } from '../interfaces/event-storage.interface.js';
import type {
    TimetableEvent, EventException, EventInstructor, EventGroup, ScheduleQuery,
} from '../interfaces/types.js';

export class InMemoryTimetableEventStorage extends TimetableEventStorage {
    private events = new Map<string, TimetableEvent>();
    private exceptions = new Map<string, EventException>();
    private instructors = new Map<string, EventInstructor>();
    private groups = new Map<string, EventGroup>();

    async create(data: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<TimetableEvent> {
        const event: TimetableEvent = {
            ...data,
            id: crypto.randomUUID(),
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.events.set(event.id, event);
        return event;
    }

    async findById(id: string): Promise<TimetableEvent | null> {
        return this.events.get(id) ?? null;
    }

    async findByQuery(query: ScheduleQuery): Promise<TimetableEvent[]> {
        let results = Array.from(this.events.values());

        if (query.courseIds?.length) {
            results = results.filter(e => e.courseId && query.courseIds!.includes(e.courseId));
        }

        if (query.roomIds?.length) {
            results = results.filter(e => e.roomId && query.roomIds!.includes(e.roomId));
        }

        if (query.periodId) {
            results = results.filter(e => e.periodId === query.periodId);
        }

        if (query.instructorIds?.length) {
            const eventIds = new Set<string>();
            for (const inst of this.instructors.values()) {
                if (query.instructorIds!.includes(inst.instructorId)) {
                    eventIds.add(inst.eventId);
                }
            }
            results = results.filter(e => eventIds.has(e.id));
        }

        if (query.groupIds?.length) {
            const eventIds = new Set<string>();
            for (const grp of this.groups.values()) {
                if (query.groupIds!.includes(grp.groupId)) {
                    eventIds.add(grp.eventId);
                }
            }
            results = results.filter(e => eventIds.has(e.id));
        }

        return results;
    }

    async update(id: string, data: Partial<TimetableEvent>, expectedVersion?: number): Promise<TimetableEvent> {
        const existing = this.events.get(id);
        if (!existing) throw new Error(`Event ${id} not found`);

        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
            throw new Error(`Version conflict: expected ${expectedVersion}, got ${existing.version}`);
        }

        const updated: TimetableEvent = {
            ...existing,
            ...data,
            id,
            version: existing.version + 1,
            updatedAt: new Date(),
        };
        this.events.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.events.delete(id);
    }

    async createException(data: Omit<EventException, 'id'>): Promise<EventException> {
        const exception: EventException = { ...data, id: crypto.randomUUID() };
        this.exceptions.set(exception.id, exception);
        return exception;
    }

    async findExceptions(eventId: string): Promise<EventException[]> {
        return Array.from(this.exceptions.values()).filter(e => e.eventId === eventId);
    }

    async deleteException(id: string): Promise<void> {
        this.exceptions.delete(id);
    }

    async addInstructor(data: Omit<EventInstructor, 'id'>): Promise<EventInstructor> {
        const instructor: EventInstructor = { ...data, id: crypto.randomUUID() };
        this.instructors.set(instructor.id, instructor);
        return instructor;
    }

    async removeInstructor(eventId: string, instructorId: string): Promise<void> {
        for (const [key, val] of this.instructors) {
            if (val.eventId === eventId && val.instructorId === instructorId) {
                this.instructors.delete(key);
            }
        }
    }

    async findInstructors(eventId: string): Promise<EventInstructor[]> {
        return Array.from(this.instructors.values()).filter(i => i.eventId === eventId);
    }

    async addGroup(data: Omit<EventGroup, 'id'>): Promise<EventGroup> {
        const group: EventGroup = { ...data, id: crypto.randomUUID() };
        this.groups.set(group.id, group);
        return group;
    }

    async removeGroup(eventId: string, groupId: string): Promise<void> {
        for (const [key, val] of this.groups) {
            if (val.eventId === eventId && val.groupId === groupId) {
                this.groups.delete(key);
            }
        }
    }

    async findGroups(eventId: string): Promise<EventGroup[]> {
        return Array.from(this.groups.values()).filter(g => g.eventId === eventId);
    }
}
