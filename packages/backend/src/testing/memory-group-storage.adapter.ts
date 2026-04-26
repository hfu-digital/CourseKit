import { EntityNotFoundError } from '../errors/index.js';
import { GroupStorage } from '../interfaces/group-storage.interface.js';
import type { Group, StudentGroup } from '../interfaces/types.js';

export class InMemoryGroupStorage extends GroupStorage {
    private groups = new Map<string, Group>();
    private studentGroups = new Map<string, StudentGroup>();

    async create(data: Omit<Group, 'id'>): Promise<Group> {
        const group: Group = { ...data, id: crypto.randomUUID() };
        this.groups.set(group.id, group);
        return group;
    }

    async findById(id: string): Promise<Group | null> {
        return this.groups.get(id) ?? null;
    }

    async findAll(filters?: { type?: Group['type'] }): Promise<Group[]> {
        let results = Array.from(this.groups.values());
        if (filters?.type) {
            results = results.filter((g) => g.type === filters.type);
        }
        return results;
    }

    async update(id: string, data: Partial<Group>): Promise<Group> {
        const existing = this.groups.get(id);
        if (!existing) throw new EntityNotFoundError('Group', id);
        const updated: Group = { ...existing, ...data, id };
        this.groups.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.groups.delete(id);
    }

    async addStudent(data: Omit<StudentGroup, 'id'>): Promise<StudentGroup> {
        const sg: StudentGroup = { ...data, id: crypto.randomUUID() };
        this.studentGroups.set(sg.id, sg);
        return sg;
    }

    async removeStudent(studentId: string, groupId: string): Promise<void> {
        for (const [key, val] of this.studentGroups) {
            if (val.studentId === studentId && val.groupId === groupId) {
                this.studentGroups.delete(key);
            }
        }
    }

    async findStudents(groupId: string): Promise<StudentGroup[]> {
        return Array.from(this.studentGroups.values()).filter((sg) => sg.groupId === groupId);
    }

    async findGroupsForStudent(studentId: string): Promise<StudentGroup[]> {
        return Array.from(this.studentGroups.values()).filter((sg) => sg.studentId === studentId);
    }
}
