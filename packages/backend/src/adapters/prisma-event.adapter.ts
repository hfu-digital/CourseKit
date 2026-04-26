import { VersionConflictError } from '../errors/index.js';
import { TimetableEventStorage } from '../interfaces/event-storage.interface.js';
import type {
    EventException,
    EventGroup,
    EventInstructor,
    ScheduleQuery,
    TimetableEvent,
} from '../interfaces/types.js';

// Structural typing — never import @prisma/client
type PrismaEventDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any; include?: any }) => Promise<any>;
    findMany: (args: { where?: any; include?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

type PrismaExceptionDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    updateMany: (args: { where: any; data: any }) => Promise<{ count: number }>;
    delete: (args: { where: any }) => Promise<any>;
};

type PrismaEventInstructorDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findMany: (args: { where?: any }) => Promise<any[]>;
    delete: (args: { where: any }) => Promise<any>;
    deleteMany: (args: { where: any }) => Promise<any>;
};

type PrismaEventGroupDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findMany: (args: { where?: any }) => Promise<any[]>;
    delete: (args: { where: any }) => Promise<any>;
    deleteMany: (args: { where: any }) => Promise<any>;
};

export class PrismaTimetableEventAdapter extends TimetableEventStorage {
    constructor(
        private readonly eventDelegate: PrismaEventDelegate,
        private readonly exceptionDelegate: PrismaExceptionDelegate,
        private readonly instructorDelegate: PrismaEventInstructorDelegate,
        private readonly groupDelegate: PrismaEventGroupDelegate,
    ) {
        super();
    }

    async create(
        data: Omit<TimetableEvent, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
    ): Promise<TimetableEvent> {
        return this.eventDelegate.create({
            data: {
                ...data,
                version: 0,
            },
        });
    }

    async findById(id: string): Promise<TimetableEvent | null> {
        return this.eventDelegate.findUnique({ where: { id } });
    }

    async findByQuery(query: ScheduleQuery): Promise<TimetableEvent[]> {
        const where: any = {};

        // Date range filter: events that could have occurrences in this range
        if (query.dateRange) {
            where.OR = [
                // Non-recurring events in range
                {
                    recurrenceRule: null,
                    startTime: {
                        gte: query.dateRange.start,
                        lte: query.dateRange.end,
                    },
                },
                // Recurring events (need to be materialized later)
                {
                    recurrenceRule: { not: null },
                },
            ];
        }

        if (query.courseIds?.length) {
            where.courseId = { in: query.courseIds };
        }

        if (query.roomIds?.length) {
            where.roomId = { in: query.roomIds };
        }

        if (query.periodId) {
            where.periodId = query.periodId;
        }

        if (query.instructorIds?.length) {
            where.instructors = {
                some: { instructorId: { in: query.instructorIds } },
            };
        }

        if (query.groupIds?.length) {
            where.groups = {
                some: { groupId: { in: query.groupIds } },
            };
        }

        return this.eventDelegate.findMany({ where });
    }

    async update(
        id: string,
        data: Partial<TimetableEvent>,
        expectedVersion?: number,
    ): Promise<TimetableEvent> {
        const where: any = { id };

        if (expectedVersion !== undefined) {
            where.version = expectedVersion;
        }

        return this.eventDelegate.update({
            where,
            data: {
                ...data,
                version: { increment: 1 },
                updatedAt: new Date(),
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.eventDelegate.delete({ where: { id } });
    }

    async createException(data: Omit<EventException, 'id'>): Promise<EventException> {
        return this.exceptionDelegate.create({ data });
    }

    async findExceptions(eventId: string): Promise<EventException[]> {
        return this.exceptionDelegate.findMany({ where: { eventId } });
    }

    async updateException(
        id: string,
        data: Partial<EventException>,
        expectedVersion?: number,
    ): Promise<EventException> {
        if (expectedVersion === undefined) {
            return this.exceptionDelegate.update({ where: { id }, data });
        }
        const result = await this.exceptionDelegate.updateMany({
            where: { id, version: expectedVersion },
            data: { ...data, version: expectedVersion + 1 },
        });
        if (result.count === 0) {
            const current = await this.exceptionDelegate.findUnique({ where: { id } });
            const actual = current?.version ?? -1;
            throw new VersionConflictError('EventException', id, expectedVersion, actual);
        }
        return this.exceptionDelegate.findUnique({ where: { id } });
    }

    async deleteException(id: string): Promise<void> {
        await this.exceptionDelegate.delete({ where: { id } });
    }

    async addInstructor(data: Omit<EventInstructor, 'id'>): Promise<EventInstructor> {
        return this.instructorDelegate.create({ data });
    }

    async removeInstructor(eventId: string, instructorId: string): Promise<void> {
        await this.instructorDelegate.deleteMany({
            where: { eventId, instructorId },
        });
    }

    async findInstructors(eventId: string): Promise<EventInstructor[]> {
        return this.instructorDelegate.findMany({ where: { eventId } });
    }

    async addGroup(data: Omit<EventGroup, 'id'>): Promise<EventGroup> {
        return this.groupDelegate.create({ data });
    }

    async removeGroup(eventId: string, groupId: string): Promise<void> {
        await this.groupDelegate.deleteMany({
            where: { eventId, groupId },
        });
    }

    async findGroups(eventId: string): Promise<EventGroup[]> {
        return this.groupDelegate.findMany({ where: { eventId } });
    }
}
