import { GroupStorage } from '../interfaces/group-storage.interface.js';
import type { Group, StudentGroup } from '../interfaces/types.js';

type PrismaGroupDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

type PrismaStudentGroupDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findMany: (args: { where?: any }) => Promise<any[]>;
    delete: (args: { where: any }) => Promise<any>;
    deleteMany: (args: { where: any }) => Promise<any>;
};

export class PrismaGroupAdapter extends GroupStorage {
    constructor(
        private readonly groupDelegate: PrismaGroupDelegate,
        private readonly studentGroupDelegate: PrismaStudentGroupDelegate,
    ) {
        super();
    }

    async create(data: Omit<Group, 'id'>): Promise<Group> {
        return this.groupDelegate.create({ data });
    }

    async findById(id: string): Promise<Group | null> {
        return this.groupDelegate.findUnique({ where: { id } });
    }

    async findAll(filters?: { type?: Group['type'] }): Promise<Group[]> {
        const where: any = {};
        if (filters?.type) {
            where.type = filters.type;
        }
        return this.groupDelegate.findMany({ where });
    }

    async update(id: string, data: Partial<Group>): Promise<Group> {
        return this.groupDelegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.groupDelegate.delete({ where: { id } });
    }

    async addStudent(data: Omit<StudentGroup, 'id'>): Promise<StudentGroup> {
        return this.studentGroupDelegate.create({ data });
    }

    async removeStudent(studentId: string, groupId: string): Promise<void> {
        await this.studentGroupDelegate.deleteMany({
            where: { studentId, groupId },
        });
    }

    async findStudents(groupId: string): Promise<StudentGroup[]> {
        return this.studentGroupDelegate.findMany({ where: { groupId } });
    }

    async findGroupsForStudent(studentId: string): Promise<StudentGroup[]> {
        return this.studentGroupDelegate.findMany({ where: { studentId } });
    }
}
