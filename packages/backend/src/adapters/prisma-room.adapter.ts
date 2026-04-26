import { RoomStorage } from '../interfaces/room-storage.interface.js';
import type { Room } from '../interfaces/types.js';

type PrismaRoomDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

export class PrismaRoomAdapter extends RoomStorage {
    constructor(private readonly delegate: PrismaRoomDelegate) {
        super();
    }

    async create(data: Omit<Room, 'id'>): Promise<Room> {
        return this.delegate.create({ data });
    }

    async findById(id: string): Promise<Room | null> {
        return this.delegate.findUnique({ where: { id } });
    }

    async findAll(filters?: {
        building?: string;
        campus?: string;
        minCapacity?: number;
        tags?: Record<string, unknown>;
    }): Promise<Room[]> {
        const where: any = {};

        if (filters?.building) {
            where.building = filters.building;
        }

        if (filters?.campus) {
            where.campus = filters.campus;
        }

        if (filters?.minCapacity !== undefined) {
            where.capacity = { gte: filters.minCapacity };
        }

        return this.delegate.findMany({ where });
    }

    async update(id: string, data: Partial<Room>): Promise<Room> {
        return this.delegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }
}
