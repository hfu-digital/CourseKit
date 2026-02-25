import { LocationDistanceStorage } from '../interfaces/location-distance-storage.interface.js';
import type { LocationDistance } from '../interfaces/types.js';

export class InMemoryLocationDistanceStorage extends LocationDistanceStorage {
    private distances = new Map<string, LocationDistance>();

    async create(data: Omit<LocationDistance, 'id'>): Promise<LocationDistance> {
        const distance: LocationDistance = { ...data, id: crypto.randomUUID() };
        this.distances.set(distance.id, distance);
        return distance;
    }

    async findByCampuses(fromCampus: string, toCampus: string): Promise<LocationDistance | null> {
        for (const d of this.distances.values()) {
            if (d.fromCampus === fromCampus && d.toCampus === toCampus) return d;
        }
        return null;
    }

    async findAll(): Promise<LocationDistance[]> {
        return Array.from(this.distances.values());
    }

    async update(id: string, data: Partial<LocationDistance>): Promise<LocationDistance> {
        const existing = this.distances.get(id);
        if (!existing) throw new Error(`LocationDistance ${id} not found`);
        const updated: LocationDistance = { ...existing, ...data, id };
        this.distances.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.distances.delete(id);
    }
}
