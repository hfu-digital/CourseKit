/**
 * Generic snapshot diff utility for StarPlan-tracked entities.
 *
 * Given a previous and a current snapshot of an entity collection (keyed by
 * stable `id`), `detectChanges` produces `ChangeRecord` rows describing every
 * create / update / delete. Updates list the specific fields that changed.
 *
 * Output is intentionally serializable JSON so consumers can persist directly
 * (e.g. to a `CkStarPlanChangeLog` table in their Prisma schema).
 */

export type ChangeAction = 'created' | 'updated' | 'deleted';

export interface ChangeRecord<T extends object = Record<string, unknown>> {
    entityType: string;
    entityId: string;
    action: ChangeAction;
    /** Only present on `updated` and `deleted`. */
    previousData: T | null;
    /** Only present on `created` and `updated`. */
    newData: T | null;
    /** Field names that changed. Empty for create/delete. */
    changedFields: string[];
}

export interface DetectChangesOptions {
    /**
     * Fields whose changes should never be reported (e.g. `updatedAt`,
     * computed timestamps, derived fields).
     */
    ignoreFields?: string[];
}

const shallowEqualValue = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object') {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    }
    return false;
};

function diffFields<T extends object>(previous: T, current: T, ignore: Set<string>): string[] {
    const changed: string[] = [];
    const keys = new Set<string>([...Object.keys(previous), ...Object.keys(current)]);
    for (const key of keys) {
        if (ignore.has(key)) continue;
        const prev = (previous as Record<string, unknown>)[key];
        const curr = (current as Record<string, unknown>)[key];
        if (!shallowEqualValue(prev, curr)) changed.push(key);
    }
    return changed;
}

export function detectChanges<T extends object>(
    entityType: string,
    previous: ReadonlyArray<T & { id: string }>,
    current: ReadonlyArray<T & { id: string }>,
    options: DetectChangesOptions = {},
): ChangeRecord<T>[] {
    const ignore = new Set(options.ignoreFields ?? []);
    const prevById = new Map(previous.map((row) => [row.id, row]));
    const currById = new Map(current.map((row) => [row.id, row]));
    const changes: ChangeRecord<T>[] = [];

    for (const [id, curr] of currById) {
        const prev = prevById.get(id);
        if (!prev) {
            changes.push({
                entityType,
                entityId: id,
                action: 'created',
                previousData: null,
                newData: curr,
                changedFields: [],
            });
        } else {
            const changedFields = diffFields(prev, curr, ignore);
            if (changedFields.length > 0) {
                changes.push({
                    entityType,
                    entityId: id,
                    action: 'updated',
                    previousData: prev,
                    newData: curr,
                    changedFields,
                });
            }
        }
    }

    for (const [id, prev] of prevById) {
        if (!currById.has(id)) {
            changes.push({
                entityType,
                entityId: id,
                action: 'deleted',
                previousData: prev,
                newData: null,
                changedFields: [],
            });
        }
    }

    return changes;
}
