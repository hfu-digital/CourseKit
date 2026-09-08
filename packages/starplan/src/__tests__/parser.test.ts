import { describe, expect, it } from 'bun:test';
import { parseIcal } from '../parser/ical.js';
import { extractInstructor } from '../extract/instructor.js';

const baseEvent = (extras: string = '') => `BEGIN:VEVENT
UID:lecture-001@hs-furtwangen.de
SUMMARY:Algorithmen und Datenstrukturen
DESCRIPTION:Dozent: Prof. Dr. Beispiel
DTSTART:20260427T080000
DTEND:20260427T093000
LOCATION:A1.0.1
${extras}END:VEVENT
`;

describe('parseIcal', () => {
    it('parses a single VEVENT block', () => {
        const events = parseIcal(`BEGIN:VCALENDAR\n${baseEvent()}END:VCALENDAR`);
        expect(events).toHaveLength(1);
        const event = events[0];
        expect(event.uid).toBe('lecture-001@hs-furtwangen.de');
        expect(event.summary).toBe('Algorithmen und Datenstrukturen');
        expect(event.location).toBe('A1.0.1');
        expect(event.dtstart.getHours()).toBe(8);
        expect(event.dtend.getHours()).toBe(9);
        expect(event.dtend.getMinutes()).toBe(30);
        expect(event.weekday).toBe(event.dtstart.getDay());
        expect(event.studyBlock).toBe(1);
        expect(event.rrule).toBeNull();
    });

    it('extracts RRULE strings when present', () => {
        const ical = `BEGIN:VCALENDAR\n${baseEvent('RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=14\n')}END:VCALENDAR`;
        const events = parseIcal(ical);
        expect(events[0].rrule).toBe('FREQ=WEEKLY;BYDAY=MO;COUNT=14');
    });

    it('handles unfolded continuation lines', () => {
        const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:long@hs-furtwangen.de
SUMMARY:A very long lecture title that gets folded across\
 two physical lines
DTSTART:20260427T080000
DTEND:20260427T093000
END:VEVENT
END:VCALENDAR`;
        const events = parseIcal(ical);
        expect(events[0].summary).toContain('folded across');
        expect(events[0].summary).toContain('two physical lines');
    });

    it('returns empty array for malformed iCal', () => {
        expect(parseIcal('garbage')).toEqual([]);
        expect(parseIcal('')).toEqual([]);
    });

    it('skips VEVENT blocks missing DTSTART or DTEND', () => {
        const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:broken-001
SUMMARY:Missing dates
END:VEVENT
END:VCALENDAR`;
        expect(parseIcal(ical)).toEqual([]);
    });

    it('parses multiple events in one feed', () => {
        const ical = `BEGIN:VCALENDAR\n${baseEvent()}${baseEvent()}END:VCALENDAR`;
        expect(parseIcal(ical)).toHaveLength(2);
    });

    it('unescapes iCal text correctly', () => {
        const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:esc-001
SUMMARY:Course\\, Part 1
DESCRIPTION:Line 1\\nLine 2
DTSTART:20260427T080000
DTEND:20260427T093000
END:VEVENT
END:VCALENDAR`;
        const event = parseIcal(ical)[0];
        expect(event.summary).toBe('Course, Part 1');
        expect(event.description).toBe('Line 1\nLine 2');
    });
});

describe('extractInstructor', () => {
    it('recognizes the unlabeled instructor line used by HFU exports', () => {
        expect(
            extractInstructor('Betriebliches Gesundheitsmanagement\nKirsten Steinhausen\nAGF1\n'),
        ).toBe('Kirsten Steinhausen');
    });

    it('keeps multiple instructors on one source line', () => {
        expect(
            extractInstructor('Research Projekt Themen Vorstellung\nMax Federer, Erika Muster\nAIN1'),
        ).toBe('Max Federer, Erika Muster');
    });
});
