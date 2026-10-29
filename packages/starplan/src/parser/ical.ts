/**
 * Tiny iCal (RFC 5545) parser tailored for StarPlan VEVENT output.
 * Lifted from `splan-api` and extended to surface RRULE strings (passed
 * straight through to CourseKit's `RecurrenceService` for materialization).
 */

import {
    getStudyBlockFromTime,
    HFU_STUDY_BLOCK_CONFIG,
    type StudyBlockConfig,
} from '../study-blocks/index.js';

export interface ParsedVEvent {
    /** iCal UID (or a synthetic fallback). */
    uid: string;
    summary: string;
    description?: string;
    /** Local-time start instant. Note: the parser does not apply timezone shifts. */
    dtstart: Date;
    /** Local-time end instant. */
    dtend: Date;
    location?: string;
    /** RFC 5545 RRULE string, if present (e.g. `FREQ=WEEKLY;BYDAY=MO;COUNT=14`). */
    rrule: string | null;
    /** Day-of-week of `dtstart`, 0=Sunday … 6=Saturday. */
    weekday: number;
    /**
     * 1-based study block index, or `null` if the event time falls outside the
     * configured grid. Defaults to the HFU block configuration.
     */
    studyBlock: number | null;
}

export interface ParseIcalOptions {
    studyBlocks?: StudyBlockConfig;
}

export function parseIcal(icalData: string, options: ParseIcalOptions = {}): ParsedVEvent[] {
    const studyBlocks = options.studyBlocks ?? HFU_STUDY_BLOCK_CONFIG;
    const events: ParsedVEvent[] = [];
    const blocks = icalData.split('BEGIN:VEVENT');

    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const endIndex = block.indexOf('END:VEVENT');
        if (endIndex === -1) continue;
        const event = parseVEvent(block.substring(0, endIndex), studyBlocks);
        if (event) events.push(event);
    }

    return events;
}

function parseVEvent(content: string, studyBlocks: StudyBlockConfig): ParsedVEvent | null {
    const lines = unfoldIcalLines(content);
    const props: Record<string, string> = {};

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;
        let key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        const semicolonIndex = key.indexOf(';');
        if (semicolonIndex !== -1) key = key.substring(0, semicolonIndex);
        props[key.toUpperCase()] = value;
    }

    const dtstart = parseIcalDate(props.DTSTART);
    const dtend = parseIcalDate(props.DTEND);
    if (!dtstart || !dtend) return null;

    return {
        uid: props.UID || `event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        summary: unescapeIcalText(props.SUMMARY ?? ''),
        description: props.DESCRIPTION ? unescapeIcalText(props.DESCRIPTION) : undefined,
        dtstart,
        dtend,
        location: props.LOCATION ? unescapeIcalText(props.LOCATION) : undefined,
        rrule: props.RRULE ? props.RRULE.trim() : null,
        weekday: dtstart.getDay(),
        studyBlock: getStudyBlockFromTime(dtstart, studyBlocks),
    };
}

function unfoldIcalLines(content: string): string[] {
    const rawLines = content.split(/\r?\n/);
    const lines: string[] = [];
    for (const rawLine of rawLines) {
        if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) {
            if (lines.length > 0) lines[lines.length - 1] += rawLine.substring(1);
        } else if (rawLine.trim()) {
            lines.push(rawLine);
        }
    }
    return lines;
}

function parseIcalDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.replace('Z', '');

    if (clean.length === 8) {
        const year = Number.parseInt(clean.substring(0, 4), 10);
        const month = Number.parseInt(clean.substring(4, 6), 10) - 1;
        const day = Number.parseInt(clean.substring(6, 8), 10);
        return new Date(year, month, day);
    }

    if (clean.length >= 15 && clean.includes('T')) {
        const year = Number.parseInt(clean.substring(0, 4), 10);
        const month = Number.parseInt(clean.substring(4, 6), 10) - 1;
        const day = Number.parseInt(clean.substring(6, 8), 10);
        const hours = Number.parseInt(clean.substring(9, 11), 10);
        const minutes = Number.parseInt(clean.substring(11, 13), 10);
        const seconds = Number.parseInt(clean.substring(13, 15), 10);
        return new Date(year, month, day, hours, minutes, seconds);
    }

    return null;
}

function unescapeIcalText(text: string): string {
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

export function groupBySummary(events: ParsedVEvent[]): Map<string, ParsedVEvent[]> {
    const groups = new Map<string, ParsedVEvent[]>();
    for (const event of events) {
        const existing = groups.get(event.summary) ?? [];
        existing.push(event);
        groups.set(event.summary, existing);
    }
    return groups;
}

export function groupBySchedule(events: ParsedVEvent[]): Map<string, ParsedVEvent[]> {
    const groups = new Map<string, ParsedVEvent[]>();
    for (const event of events) {
        const key = `${event.weekday}-${event.studyBlock ?? 'unknown'}`;
        const existing = groups.get(key) ?? [];
        existing.push(event);
        groups.set(key, existing);
    }
    return groups;
}
