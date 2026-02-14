import type { LocationDistance } from './types.js';

export abstract class LocationDistanceStorage {
    abstract create(data: Omit<LocationDistance, 'id'>): Promise<LocationDistance>;
    abstract findByCampuses(fromCampus: string, toCampus: string): Promise<LocationDistance | null>;
    abstract findAll(): Promise<LocationDistance[]>;
    abstract update(id: string, data: Partial<LocationDistance>): Promise<LocationDistance>;
    abstract delete(id: string): Promise<void>;
}
