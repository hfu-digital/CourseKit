import type { ConflictCheckResult, Conflict } from '../interfaces/types.js';

/**
 * Assert that a conflict check result has no conflicts.
 * Throws with details if conflicts are found.
 */
export function expectNoConflicts(result: ConflictCheckResult): void {
    if (result.conflicts.length > 0) {
        const details = result.conflicts
            .map(c => `  - [${c.severity}] ${c.type}: ${c.message}`)
            .join('\n');
        throw new Error(`Expected no conflicts, but found ${result.conflicts.length}:\n${details}`);
    }
}

/**
 * Assert that a conflict of a specific type exists in the result.
 * Returns the matching conflict for further assertions.
 */
export function expectConflict(
    result: ConflictCheckResult,
    type: string,
    severity?: 'error' | 'warning',
): Conflict {
    const matching = result.conflicts.filter(c => {
        if (c.type !== type) return false;
        if (severity && c.severity !== severity) return false;
        return true;
    });

    if (matching.length === 0) {
        const available = result.conflicts.map(c => `${c.type} (${c.severity})`).join(', ');
        throw new Error(
            `Expected conflict of type "${type}"${severity ? ` with severity "${severity}"` : ''}, ` +
            `but none found. Available conflicts: ${available || 'none'}`,
        );
    }

    return matching[0];
}

/**
 * Assert the total number of conflicts.
 */
export function expectConflictCount(result: ConflictCheckResult, count: number): void {
    if (result.conflicts.length !== count) {
        throw new Error(`Expected ${count} conflicts, but found ${result.conflicts.length}`);
    }
}

/**
 * Assert that a conflict involves specific event IDs.
 */
export function expectConflictInvolves(conflict: Conflict, ...eventIds: string[]): void {
    for (const id of eventIds) {
        if (!conflict.involvedEventIds.includes(id)) {
            throw new Error(
                `Expected conflict to involve event ${id}, ` +
                `but it involves: ${conflict.involvedEventIds.join(', ')}`,
            );
        }
    }
}
