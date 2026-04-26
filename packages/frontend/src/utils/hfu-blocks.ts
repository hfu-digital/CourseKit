/** HFU (Hochschule Furtwangen) study block definitions and utilities. */

export interface StudyBlock {
    block: number;
    start: string; // HH:MM
    end: string; // HH:MM
}

export const STUDY_BLOCKS: StudyBlock[] = [
    { block: 1, start: '08:00', end: '09:30' },
    { block: 2, start: '09:45', end: '11:15' },
    { block: 3, start: '11:30', end: '13:00' },
    { block: 4, start: '14:00', end: '15:30' },
    { block: 5, start: '15:45', end: '17:15' },
    { block: 6, start: '17:30', end: '19:00' },
];

export const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Parse an "HH:MM" time string into total minutes since midnight. */
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Map an "HH:MM" time string to its HFU study block number (1–6).
 * Returns null if the time does not fall within any block.
 */
export function getStudyBlockFromTime(time: string): number | null {
    for (const block of STUDY_BLOCKS) {
        if (time >= block.start && time <= block.end) {
            return block.block;
        }
    }
    return null;
}

/**
 * Return the Monday of the week containing the given date.
 * Time is reset to midnight (00:00:00.000).
 */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Compute the proportional height of an event within a block cell.
 *
 * The height represents how far into the block the event extends —
 * clamped to a minimum of 25 % and a maximum of 100 %.
 *
 * @param eventEnd   - "HH:MM" end time of the event
 * @param blockStart - "HH:MM" start of the containing block
 * @param blockEnd   - "HH:MM" end of the containing block
 * @returns A CSS percentage string, e.g. "75%"
 */
export function getEventHeight(eventEnd: string, blockStart: string, blockEnd: string): string {
    const blockStartMins = timeToMinutes(blockStart);
    const blockEndMins = timeToMinutes(blockEnd);
    const eventEndMins = timeToMinutes(eventEnd);
    const blockDuration = blockEndMins - blockStartMins;

    const effectiveEnd = Math.min(eventEndMins, blockEndMins);
    const heightPercent = ((effectiveEnd - blockStartMins) / blockDuration) * 100;

    return `${Math.min(Math.max(heightPercent, 25), 100)}%`;
}
