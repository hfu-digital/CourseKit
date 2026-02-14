import { AcademicPeriodStorage } from '../interfaces/period-storage.interface.js';
import type { AcademicPeriod, DateRange } from '../interfaces/types.js';

type PrismaPeriodDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

export class PrismaAcademicPeriodAdapter extends AcademicPeriodStorage {
    constructor(private readonly delegate: PrismaPeriodDelegate) {
        super();
    }

    async create(data: Omit<AcademicPeriod, 'id'>): Promise<AcademicPeriod> {
        return this.delegate.create({ data });
    }

    async findById(id: string): Promise<AcademicPeriod | null> {
        return this.delegate.findUnique({ where: { id } });
    }

    async findAll(filters?: { type?: AcademicPeriod['type']; parentId?: string }): Promise<AcademicPeriod[]> {
        const where: any = {};
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.parentId) {
            where.parentId = filters.parentId;
        }
        return this.delegate.findMany({ where });
    }

    async findOverlapping(dateRange: DateRange): Promise<AcademicPeriod[]> {
        return this.delegate.findMany({
            where: {
                startDate: { lte: dateRange.end },
                endDate: { gte: dateRange.start },
            },
        });
    }

    async findChildren(parentId: string): Promise<AcademicPeriod[]> {
        return this.delegate.findMany({ where: { parentId } });
    }

    async update(id: string, data: Partial<AcademicPeriod>): Promise<AcademicPeriod> {
        return this.delegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }
}
