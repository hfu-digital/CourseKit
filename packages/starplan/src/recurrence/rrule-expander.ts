/**
 * RRULE handling for parsed StarPlan VEVENTs.
 *
 * StarPlan emits RFC 5545 RRULE strings on recurring events. CourseKit's
 * `RecurrenceService` (in `@hfu.digital/coursekit-nestjs`) materializes
 * occurrences from a stored `recurrenceRule: string`, so we don't expand them
 * here — we only normalize the string and (optionally) validate it.
 *
 * `rrule` is included as a runtime dependency so consumers can validate
 * without depending on the backend package directly.
 */

import * as rruleModule from 'rrule';

// rrule publishes CommonJS: Node ESM exposes its implementation under default,
// while bundlers may expose the named exports directly.
const rruleNamespace = ((rruleModule as unknown as { default?: typeof rruleModule }).default ?? rruleModule);
const { rrulestr } = rruleNamespace;

export interface NormalizedRecurrence {
    /** Original RRULE string from VEVENT (trimmed). */
    raw: string;
    /** Reserialized RRULE string after a parse round-trip. Useful for storage. */
    normalized: string;
}

/** Returns `null` if `rule` is not a valid RFC 5545 RRULE. */
export function normalizeRrule(rule: string): NormalizedRecurrence | null {
    const raw = rule.trim();
    if (!raw) return null;
    try {
        const parsed = rrulestr(`RRULE:${raw.replace(/^RRULE:/i, '')}`);
        return { raw, normalized: parsed.toString().replace(/^RRULE:/, '') };
    } catch {
        return null;
    }
}

export function isValidRrule(rule: string): boolean {
    return normalizeRrule(rule) !== null;
}
