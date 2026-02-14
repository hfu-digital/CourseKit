import type { Course } from './types.js';

export abstract class CourseStorage {
    abstract create(data: Omit<Course, 'id'>): Promise<Course>;
    abstract findById(id: string): Promise<Course | null>;
    abstract findByCode(code: string): Promise<Course | null>;
    abstract findAll(filters?: { parentId?: string }): Promise<Course[]>;
    abstract findChildren(parentId: string): Promise<Course[]>;
    abstract update(id: string, data: Partial<Course>): Promise<Course>;
    abstract delete(id: string): Promise<void>;
}
