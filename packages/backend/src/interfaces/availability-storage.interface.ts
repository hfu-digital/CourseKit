import type { Availability, AvailabilityEntityType, DateRange } from './types.js';

export abstract class AvailabilityStorage {
    /** Complete rules for these entities; specificDate selection is applied per occurrence. */
    findByEntities?(entities: { entityType: AvailabilityEntityType; entityId: string }[]): Promise<Availability[]>;

    abstract create(data: Omit<Availability, 'id'>): Promise<Availability>;
    abstract findById(id: string): Promise<Availability | null>;
    abstract findByEntity(
        entityType: AvailabilityEntityType,
        entityId: string,
    ): Promise<Availability[]>;
    abstract findByEntityInRange(
        entityType: AvailabilityEntityType,
        entityId: string,
        dateRange: DateRange,
    ): Promise<Availability[]>;
    abstract update(
        id: string,
        data: Partial<Availability>,
        expectedVersion?: number,
    ): Promise<Availability>;
    abstract delete(id: string): Promise<void>;
}
