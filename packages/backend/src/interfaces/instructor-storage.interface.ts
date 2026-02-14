import type { Instructor } from './types.js';

export abstract class InstructorStorage {
    abstract create(data: Omit<Instructor, 'id'>): Promise<Instructor>;
    abstract findById(id: string): Promise<Instructor | null>;
    abstract findAll(filters?: { tags?: Record<string, unknown> }): Promise<Instructor[]>;
    abstract update(id: string, data: Partial<Instructor>): Promise<Instructor>;
    abstract delete(id: string): Promise<void>;
}
