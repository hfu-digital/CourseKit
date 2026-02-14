import { describe, it, expect } from 'bun:test';
import { TimeService } from '../domain/time.service.js';

describe('TimeService', () => {
    const service = new TimeService();

    describe('overlaps', () => {
        it('should detect overlapping intervals', () => {
            const a = new Date('2026-03-02T09:00:00Z');
            const b = new Date('2026-03-02T09:30:00Z');
            expect(service.overlaps(a, 60, b, 60)).toBe(true);
        });

        it('should not detect overlap for adjacent intervals', () => {
            const a = new Date('2026-03-02T09:00:00Z');
            const b = new Date('2026-03-02T10:00:00Z');
            expect(service.overlaps(a, 60, b, 60)).toBe(false);
        });

        it('should not detect overlap for non-overlapping intervals', () => {
            const a = new Date('2026-03-02T09:00:00Z');
            const b = new Date('2026-03-02T11:00:00Z');
            expect(service.overlaps(a, 60, b, 60)).toBe(false);
        });

        it('should detect full containment', () => {
            const a = new Date('2026-03-02T09:00:00Z');
            const b = new Date('2026-03-02T09:15:00Z');
            expect(service.overlaps(a, 90, b, 30)).toBe(true);
        });
    });

    describe('endTime', () => {
        it('should compute correct end time', () => {
            const start = new Date('2026-03-02T09:00:00Z');
            const end = service.endTime(start, 90);
            expect(end.toISOString()).toBe('2026-03-02T10:30:00.000Z');
        });
    });

    describe('isInRange', () => {
        it('should return true when date is in range', () => {
            const date = new Date('2026-03-05T12:00:00Z');
            const range = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-07T23:59:59Z'),
            };
            expect(service.isInRange(date, range)).toBe(true);
        });

        it('should return false when date is outside range', () => {
            const date = new Date('2026-04-01T12:00:00Z');
            const range = {
                start: new Date('2026-03-01T00:00:00Z'),
                end: new Date('2026-03-07T23:59:59Z'),
            };
            expect(service.isInRange(date, range)).toBe(false);
        });
    });

    describe('gapMinutes', () => {
        it('should compute gap between events', () => {
            const endFirst = new Date('2026-03-02T10:30:00Z');
            const startSecond = new Date('2026-03-02T11:00:00Z');
            expect(service.gapMinutes(endFirst, startSecond)).toBe(30);
        });

        it('should return negative for overlapping events', () => {
            const endFirst = new Date('2026-03-02T10:30:00Z');
            const startSecond = new Date('2026-03-02T10:00:00Z');
            expect(service.gapMinutes(endFirst, startSecond)).toBe(-30);
        });
    });
});
