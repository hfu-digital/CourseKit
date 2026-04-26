import { EntityNotFoundError, VersionConflictError } from '../errors/index.js';
import { AvailabilityStorage } from '../interfaces/availability-storage.interface.js';
import type { Availability, AvailabilityEntityType, DateRange } from '../interfaces/types.js';

export class InMemoryAvailabilityStorage extends AvailabilityStorage {
    private items = new Map<string, Availability>();

    async create(data: Omit<Availability, 'id'>): Promise<Availability> {
        const item: Availability = { ...data, id: crypto.randomUUID(), version: 0 };
        this.items.set(item.id, item);
        return item;
    }

    async findById(id: string): Promise<Availability | null> {
        return this.items.get(id) ?? null;
    }

    async findByEntity(
        entityType: AvailabilityEntityType,
        entityId: string,
    ): Promise<Availability[]> {
        return Array.from(this.items.values()).filter(
            (a) => a.entityType === entityType && a.entityId === entityId,
        );
    }

    async findByEntityInRange(
        entityType: AvailabilityEntityType,
        entityId: string,
        dateRange: DateRange,
    ): Promise<Availability[]> {
        return Array.from(this.items.values()).filter((a) => {
            if (a.entityType !== entityType || a.entityId !== entityId) return false;

            // If has specific date, check if it falls in range
            if (a.specificDate) {
                return a.specificDate >= dateRange.start && a.specificDate <= dateRange.end;
            }

            // Recurring or day-of-week based — include (filtering happens at service level)
            return true;
        });
    }

    async update(
        id: string,
        data: Partial<Availability>,
        expectedVersion?: number,
    ): Promise<Availability> {
        const existing = this.items.get(id);
        if (!existing) throw new EntityNotFoundError('Availability', id);
        const currentVersion = existing.version ?? 0;
        if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
            throw new VersionConflictError('Availability', id, expectedVersion, currentVersion);
        }
        const updated: Availability = { ...existing, ...data, id, version: currentVersion + 1 };
        this.items.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        this.items.delete(id);
    }
}
