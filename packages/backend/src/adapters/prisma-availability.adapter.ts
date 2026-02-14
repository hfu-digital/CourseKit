import { AvailabilityStorage } from '../interfaces/availability-storage.interface.js';
import type { Availability, AvailabilityEntityType, DateRange } from '../interfaces/types.js';

type PrismaAvailabilityDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

export class PrismaAvailabilityAdapter extends AvailabilityStorage {
    constructor(private readonly delegate: PrismaAvailabilityDelegate) {
        super();
    }

    async create(data: Omit<Availability, 'id'>): Promise<Availability> {
        return this.delegate.create({ data });
    }

    async findById(id: string): Promise<Availability | null> {
        return this.delegate.findUnique({ where: { id } });
    }

    async findByEntity(entityType: AvailabilityEntityType, entityId: string): Promise<Availability[]> {
        return this.delegate.findMany({
            where: { entityType, entityId },
        });
    }

    async findByEntityInRange(entityType: AvailabilityEntityType, entityId: string, dateRange: DateRange): Promise<Availability[]> {
        return this.delegate.findMany({
            where: {
                entityType,
                entityId,
                OR: [
                    // Specific date availability in range
                    {
                        specificDate: {
                            gte: dateRange.start,
                            lte: dateRange.end,
                        },
                    },
                    // Recurring availability (no specific date)
                    {
                        specificDate: null,
                    },
                ],
            },
        });
    }

    async update(id: string, data: Partial<Availability>): Promise<Availability> {
        return this.delegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }
}
