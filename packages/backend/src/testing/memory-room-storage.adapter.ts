import { EntityNotFoundError } from '../errors/index.js';
import { RoomStorage } from '../interfaces/room-storage.interface.js';
import type { Room } from '../interfaces/types.js';

export class InMemoryRoomStorage extends RoomStorage {
    private rooms = new Map<string, Room>();

    async create(data: Omit<Room, 'id'>): Promise<Room> {
        const room: Room = { ...data, id: crypto.randomUUID() };
        this.rooms.set(room.id, room);
        return room;
    }

    async findById(id: string): Promise<Room | null> {
        return this.rooms.get(id) ?? null;
    }

    async findAll(filters?: {
        building?: string;
        campus?: string;
        minCapacity?: number;
        tags?: Record<string, unknown>;
    }): Promise<Room[]> {
        let results = Array.from(this.rooms.values());

        if (filters?.building) {
            results = results.filter((r) => r.building === filters.building);
        }
        if (filters?.campus) {
            results = results.filter((r) => r.campus === filters.campus);
        }
        if (filters?.minCapacity !== undefined) {
            results = results.filter((r) => r.capacity >= filters.minCapacity!);
        }

        return results;
    }

    async update(id: string, data: Partial<Room>): Promise<Room> {
        const existing = this.rooms.get(id);
        if (!existing) throw new EntityNotFoundError('Room', id);
        const updated: Room = { ...existing, ...data, id };
        this.rooms.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.rooms.delete(id);
    }
}
