import { InstructorStorage } from '../interfaces/instructor-storage.interface.js';
import type { Instructor } from '../interfaces/types.js';

type PrismaInstructorDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

export class PrismaInstructorAdapter extends InstructorStorage {
    constructor(private readonly delegate: PrismaInstructorDelegate) {
        super();
    }

    async create(data: Omit<Instructor, 'id'>): Promise<Instructor> {
        return this.delegate.create({ data });
    }

    async findById(id: string): Promise<Instructor | null> {
        return this.delegate.findUnique({ where: { id } });
    }

    async findAll(filters?: { tags?: Record<string, unknown> }): Promise<Instructor[]> {
        const where: any = {};
        return this.delegate.findMany({ where });
    }

    async update(id: string, data: Partial<Instructor>): Promise<Instructor> {
        return this.delegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }
}
