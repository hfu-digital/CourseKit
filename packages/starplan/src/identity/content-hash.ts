import { createHash } from 'node:crypto';

/**
 * Generate a stable content-based hash for a course, allowing tracking across
 * syncs even when iCal `UID` values change. Hash inputs are the minimal set
 * that uniquely identify a (semester, lecture, slot, date) tuple.
 */
export function generateContentHash(input: {
    semesterId: string;
    summary: string;
    weekday: number;
    studyBlock: number | null;
    startTime: Date;
}): string {
    const content = [
        input.semesterId,
        input.summary.toLowerCase().trim(),
        String(input.weekday),
        String(input.studyBlock ?? 'unknown'),
        input.startTime.toISOString().slice(0, 10),
    ].join('|');

    return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Compute an MD5 hash of a full iCal feed. Used to detect upstream changes
 * cheaply without parsing every event on every poll.
 */
export function hashIcalFeed(icalData: string): string {
    return createHash('md5').update(icalData).digest('hex');
}
