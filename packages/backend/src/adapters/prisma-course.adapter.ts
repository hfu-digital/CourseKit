import { CourseStorage } from '../interfaces/course-storage.interface.js';
import type { Course } from '../interfaces/types.js';

type PrismaCourseDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findFirst: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

export class PrismaCourseAdapter extends CourseStorage {
    constructor(private readonly delegate: PrismaCourseDelegate) {
        super();
    }

    async create(data: Omit<Course, 'id'>): Promise<Course> {
        return this.delegate.create({ data });
    }

    async findById(id: string): Promise<Course | null> {
        return this.delegate.findUnique({ where: { id } });
    }

    async findByCode(code: string): Promise<Course | null> {
        return this.delegate.findFirst({ where: { code } });
    }

    async findAll(filters?: { parentId?: string }): Promise<Course[]> {
        const where: any = {};
        if (filters?.parentId) {
            where.parentId = filters.parentId;
        }
        return this.delegate.findMany({ where });
    }

    async findChildren(parentId: string): Promise<Course[]> {
        return this.delegate.findMany({ where: { parentId } });
    }

    async update(id: string, data: Partial<Course>): Promise<Course> {
        return this.delegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }
}
