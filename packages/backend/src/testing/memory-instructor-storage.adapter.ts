import { EntityNotFoundError } from '../errors/index.js';
import { InstructorStorage } from '../interfaces/instructor-storage.interface.js';
import type { Instructor } from '../interfaces/types.js';

export class InMemoryInstructorStorage extends InstructorStorage {
    private instructors = new Map<string, Instructor>();

    async create(data: Omit<Instructor, 'id'>): Promise<Instructor> {
        const instructor: Instructor = { ...data, id: crypto.randomUUID() };
        this.instructors.set(instructor.id, instructor);
        return instructor;
    }

    async findById(id: string): Promise<Instructor | null> {
        return this.instructors.get(id) ?? null;
    }

    async findAll(filters?: { tags?: Record<string, unknown> }): Promise<Instructor[]> {
        return Array.from(this.instructors.values());
    }

    async update(id: string, data: Partial<Instructor>): Promise<Instructor> {
        const existing = this.instructors.get(id);
        if (!existing) throw new EntityNotFoundError('Instructor', id);
        const updated: Instructor = { ...existing, ...data, id };
        this.instructors.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.instructors.delete(id);
    }
}
