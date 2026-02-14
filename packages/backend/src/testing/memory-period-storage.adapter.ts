import { AcademicPeriodStorage } from '../interfaces/period-storage.interface.js';
import type { AcademicPeriod, DateRange } from '../interfaces/types.js';

export class InMemoryAcademicPeriodStorage extends AcademicPeriodStorage {
    private periods = new Map<string, AcademicPeriod>();

    async create(data: Omit<AcademicPeriod, 'id'>): Promise<AcademicPeriod> {
        const period: AcademicPeriod = { ...data, id: crypto.randomUUID() };
        this.periods.set(period.id, period);
        return period;
    }

    async findById(id: string): Promise<AcademicPeriod | null> {
        return this.periods.get(id) ?? null;
    }

    async findAll(filters?: { type?: AcademicPeriod['type']; parentId?: string }): Promise<AcademicPeriod[]> {
        let results = Array.from(this.periods.values());
        if (filters?.type) {
            results = results.filter(p => p.type === filters.type);
        }
        if (filters?.parentId) {
            results = results.filter(p => p.parentId === filters.parentId);
        }
        return results;
    }

    async findOverlapping(dateRange: DateRange): Promise<AcademicPeriod[]> {
        return Array.from(this.periods.values()).filter(
            p => p.startDate <= dateRange.end && p.endDate >= dateRange.start,
        );
    }

    async findChildren(parentId: string): Promise<AcademicPeriod[]> {
        return Array.from(this.periods.values()).filter(p => p.parentId === parentId);
    }

    async update(id: string, data: Partial<AcademicPeriod>): Promise<AcademicPeriod> {
        const existing = this.periods.get(id);
        if (!existing) throw new Error(`AcademicPeriod ${id} not found`);
        const updated: AcademicPeriod = { ...existing, ...data, id };
        this.periods.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.periods.delete(id);
    }
}
