import { describe, expect, it } from 'bun:test';
import { extractInstructor } from '../extract/instructor.js';
import { extractRoom } from '../extract/room.js';

describe('extractRoom', () => {
    it('parses HFU-style room codes', () => {
        expect(extractRoom('A1.0.1')).toEqual({
            name: 'A1.0.1',
            building: 'A1',
            floor: '0',
            isOnline: false,
        });
        expect(extractRoom('B2.1.05')).toEqual({
            name: 'B2.1.05',
            building: 'B2',
            floor: '1',
            isOnline: false,
        });
    });

    it('flags online rooms', () => {
        const result = extractRoom('Online via Zoom');
        expect(result?.isOnline).toBe(true);
        expect(result?.building).toBeNull();
    });

    it('returns null for empty location', () => {
        expect(extractRoom(undefined)).toBeNull();
        expect(extractRoom('')).toBeNull();
        expect(extractRoom('   ')).toBeNull();
    });

    it('keeps the raw name when pattern does not match', () => {
        const result = extractRoom('Aula');
        expect(result).toEqual({ name: 'Aula', building: null, floor: null, isOnline: false });
    });

    it('honors a custom pattern', () => {
        const result = extractRoom('LAB-3-B', { pattern: /^([A-Z]+)-(\d+)-/ });
        expect(result?.building).toBe('LAB');
        expect(result?.floor).toBe('3');
    });
});

describe('extractInstructor', () => {
    it('extracts the German Dozent: pattern', () => {
        expect(extractInstructor('Dozent: Prof. Dr. Mueller')).toBe('Prof. Dr. Mueller');
    });

    it('extracts the English Instructor: pattern', () => {
        expect(extractInstructor('Instructor: Jane Doe')).toBe('Jane Doe');
    });

    it('returns null when no name pattern matches', () => {
        expect(extractInstructor(undefined)).toBeNull();
        expect(extractInstructor('')).toBeNull();
        expect(extractInstructor('No instructor here')).toBeNull();
    });

    it('rejects email addresses', () => {
        expect(extractInstructor('Dozent: prof@uni.edu')).toBeNull();
    });

    it('respects custom patterns', () => {
        const result = extractInstructor('Prowadzący: Dr. Kowalski', {
            patterns: [/Prowadzący:\s*(.+?)(?:\n|$)/i],
        });
        expect(result).toBe('Dr. Kowalski');
    });
});
