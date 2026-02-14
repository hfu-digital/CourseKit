import { LocationDistanceStorage } from '../interfaces/location-distance-storage.interface.js';
import type { LocationDistance } from '../interfaces/types.js';

type PrismaLocationDistanceDelegate = {
    create: (args: { data: any }) => Promise<any>;
    findUnique: (args: { where: any }) => Promise<any>;
    findFirst: (args: { where: any }) => Promise<any>;
    findMany: (args: { where?: any; orderBy?: any }) => Promise<any[]>;
    update: (args: { where: any; data: any }) => Promise<any>;
    delete: (args: { where: any }) => Promise<any>;
};

export class PrismaLocationDistanceAdapter extends LocationDistanceStorage {
    constructor(private readonly delegate: PrismaLocationDistanceDelegate) {
        super();
    }

    async create(data: Omit<LocationDistance, 'id'>): Promise<LocationDistance> {
        return this.delegate.create({ data });
    }

    async findByCampuses(fromCampus: string, toCampus: string): Promise<LocationDistance | null> {
        return this.delegate.findFirst({
            where: { fromCampus, toCampus },
        });
    }

    async findAll(): Promise<LocationDistance[]> {
        return this.delegate.findMany({});
    }

    async update(id: string, data: Partial<LocationDistance>): Promise<LocationDistance> {
        return this.delegate.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }
}
