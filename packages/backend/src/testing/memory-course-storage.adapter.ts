import { EntityNotFoundError } from '../errors/index.js';
import { CourseStorage } from '../interfaces/course-storage.interface.js';
import type { Course } from '../interfaces/types.js';

export class InMemoryCourseStorage extends CourseStorage {
    private courses = new Map<string, Course>();

    async create(data: Omit<Course, 'id'>): Promise<Course> {
        const course: Course = { ...data, id: crypto.randomUUID() };
        this.courses.set(course.id, course);
        return course;
    }

    async findById(id: string): Promise<Course | null> {
        return this.courses.get(id) ?? null;
    }

    async findByCode(code: string): Promise<Course | null> {
        return Array.from(this.courses.values()).find((c) => c.code === code) ?? null;
    }

    async findAll(filters?: { parentId?: string }): Promise<Course[]> {
        let results = Array.from(this.courses.values());
        if (filters?.parentId) {
            results = results.filter((c) => c.parentId === filters.parentId);
        }
        return results;
    }

    async findChildren(parentId: string): Promise<Course[]> {
        return Array.from(this.courses.values()).filter((c) => c.parentId === parentId);
    }

    async update(id: string, data: Partial<Course>): Promise<Course> {
        const existing = this.courses.get(id);
        if (!existing) throw new EntityNotFoundError('Course', id);
        const updated: Course = { ...existing, ...data, id };
        this.courses.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.courses.delete(id);
    }
}
