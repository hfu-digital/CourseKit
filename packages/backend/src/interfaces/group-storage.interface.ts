import type { Group, StudentGroup } from './types.js';

export abstract class GroupStorage {
    abstract create(data: Omit<Group, 'id'>): Promise<Group>;
    abstract findById(id: string): Promise<Group | null>;
    abstract findAll(filters?: { type?: Group['type'] }): Promise<Group[]>;
    abstract update(id: string, data: Partial<Group>): Promise<Group>;
    abstract delete(id: string): Promise<void>;

    abstract addStudent(data: Omit<StudentGroup, 'id'>): Promise<StudentGroup>;
    abstract removeStudent(studentId: string, groupId: string): Promise<void>;
    abstract findStudents(groupId: string): Promise<StudentGroup[]>;
    abstract findGroupsForStudent(studentId: string): Promise<StudentGroup[]>;
}
