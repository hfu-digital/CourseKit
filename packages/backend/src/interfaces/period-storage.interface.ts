import type { AcademicPeriod, DateRange } from './types.js';

export abstract class AcademicPeriodStorage {
    abstract create(data: Omit<AcademicPeriod, 'id'>): Promise<AcademicPeriod>;
    abstract findById(id: string): Promise<AcademicPeriod | null>;
    abstract findAll(filters?: {
        type?: AcademicPeriod['type'];
        parentId?: string;
    }): Promise<AcademicPeriod[]>;
    abstract findOverlapping(dateRange: DateRange): Promise<AcademicPeriod[]>;
    abstract findChildren(parentId: string): Promise<AcademicPeriod[]>;
    abstract update(id: string, data: Partial<AcademicPeriod>): Promise<AcademicPeriod>;
    abstract delete(id: string): Promise<void>;
}
