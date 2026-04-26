import type { Room } from './types.js';

export abstract class RoomStorage {
    abstract create(data: Omit<Room, 'id'>): Promise<Room>;
    abstract findById(id: string): Promise<Room | null>;
    abstract findAll(filters?: {
        building?: string;
        campus?: string;
        minCapacity?: number;
        tags?: Record<string, unknown>;
    }): Promise<Room[]>;
    abstract update(id: string, data: Partial<Room>): Promise<Room>;
    abstract delete(id: string): Promise<void>;
}
