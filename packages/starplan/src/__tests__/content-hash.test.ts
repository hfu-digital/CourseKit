import { describe, expect, it } from 'bun:test';
import { generateContentHash, hashIcalFeed } from '../identity/content-hash.js';

describe('generateContentHash', () => {
    it('returns the same hash for identical input', () => {
        const a = generateContentHash({
            semesterId: 'sem-1',
            summary: 'Algorithms',
            weekday: 1,
            studyBlock: 1,
            startTime: new Date('2026-04-27T08:00:00Z'),
        });
        const b = generateContentHash({
            semesterId: 'sem-1',
            summary: 'Algorithms',
            weekday: 1,
            studyBlock: 1,
            startTime: new Date('2026-04-27T08:00:00Z'),
        });
        expect(a).toBe(b);
        expect(a).toHaveLength(16);
    });

    it('is case-insensitive on summary and trims whitespace', () => {
        const a = generateContentHash({
            semesterId: 'sem-1',
            summary: 'Algorithms',
            weekday: 1,
            studyBlock: 1,
            startTime: new Date('2026-04-27T08:00:00Z'),
        });
        const b = generateContentHash({
            semesterId: 'sem-1',
            summary: '  ALGORITHMS  ',
            weekday: 1,
            studyBlock: 1,
            startTime: new Date('2026-04-27T08:00:00Z'),
        });
        expect(a).toBe(b);
    });

    it('produces a different hash when any input differs', () => {
        const base = {
            semesterId: 'sem-1',
            summary: 'Algorithms',
            weekday: 1,
            studyBlock: 1,
            startTime: new Date('2026-04-27T08:00:00Z'),
        };
        expect(generateContentHash(base)).not.toBe(
            generateContentHash({ ...base, semesterId: 'sem-2' }),
        );
        expect(generateContentHash(base)).not.toBe(
            generateContentHash({ ...base, summary: 'Calculus' }),
        );
        expect(generateContentHash(base)).not.toBe(generateContentHash({ ...base, weekday: 2 }));
        expect(generateContentHash(base)).not.toBe(generateContentHash({ ...base, studyBlock: 2 }));
        expect(generateContentHash(base)).not.toBe(
            generateContentHash({ ...base, startTime: new Date('2026-04-28T08:00:00Z') }),
        );
    });

    it('treats null studyBlock distinctly from any numeric block', () => {
        const base = {
            semesterId: 'sem-1',
            summary: 'X',
            weekday: 1,
            startTime: new Date('2026-04-27T08:00:00Z'),
        };
        expect(generateContentHash({ ...base, studyBlock: null })).not.toBe(
            generateContentHash({ ...base, studyBlock: 1 }),
        );
    });
});

describe('hashIcalFeed', () => {
    it('returns the same MD5 for identical feeds', () => {
        const feed = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
        expect(hashIcalFeed(feed)).toBe(hashIcalFeed(feed));
    });

    it('returns different MD5s for different feeds', () => {
        expect(hashIcalFeed('a')).not.toBe(hashIcalFeed('b'));
    });
});
