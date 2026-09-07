import { describe, expect, it } from 'bun:test';
import { isValidRrule, normalizeRrule } from '../recurrence/rrule-expander.js';

describe('RRULE helpers', () => {
    it('normalizes valid StarPlan recurrence rules', () => {
        expect(normalizeRrule(' RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=14 ')).toEqual({
            raw: 'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=14',
            normalized: 'FREQ=WEEKLY;BYDAY=MO;COUNT=14',
        });
        expect(isValidRrule('FREQ=WEEKLY;BYDAY=MO')).toBe(true);
    });

    it('rejects empty and malformed recurrence rules', () => {
        expect(normalizeRrule('')).toBeNull();
        expect(isValidRrule('FREQ=NOT_A_REAL_FREQUENCY')).toBe(false);
    });
});
