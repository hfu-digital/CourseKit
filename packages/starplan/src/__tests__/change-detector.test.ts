import { describe, expect, it } from 'bun:test';
import { detectChanges } from '../changes/change-detector.js';

interface Course {
    id: string;
    name: string;
    instructor: string;
    weekday: number;
}

const make = (overrides: Partial<Course> = {}): Course => ({
    id: 'course-1',
    name: 'Algorithms',
    instructor: 'Prof. Mueller',
    weekday: 1,
    ...overrides,
});

describe('detectChanges', () => {
    it('reports created entities', () => {
        const changes = detectChanges<Course>('course', [], [make()]);
        expect(changes).toHaveLength(1);
        expect(changes[0].action).toBe('created');
        expect(changes[0].newData).toEqual(make());
        expect(changes[0].previousData).toBeNull();
    });

    it('reports deleted entities', () => {
        const changes = detectChanges<Course>('course', [make()], []);
        expect(changes).toHaveLength(1);
        expect(changes[0].action).toBe('deleted');
        expect(changes[0].previousData).toEqual(make());
        expect(changes[0].newData).toBeNull();
    });

    it('reports updates with changed field list', () => {
        const previous = [make()];
        const current = [make({ instructor: 'Prof. Schulz', weekday: 2 })];
        const changes = detectChanges<Course>('course', previous, current);
        expect(changes).toHaveLength(1);
        expect(changes[0].action).toBe('updated');
        expect(changes[0].changedFields.sort()).toEqual(['instructor', 'weekday']);
    });

    it('treats Date values structurally (equal timestamps = no change)', () => {
        type Row = { id: string; updatedAt: Date };
        const ts = new Date('2026-04-27T08:00:00Z');
        const previous = [{ id: '1', updatedAt: ts }];
        const current = [{ id: '1', updatedAt: new Date(ts.getTime()) }];
        expect(detectChanges<Row>('event', previous, current)).toHaveLength(0);
    });

    it('respects ignoreFields', () => {
        const previous = [
            { ...make(), updatedAt: new Date('2026-01-01') } as Course & { updatedAt: Date },
        ];
        const current = [
            { ...make(), updatedAt: new Date('2026-01-02') } as Course & { updatedAt: Date },
        ];
        const changes = detectChanges<Course & { updatedAt: Date }>('course', previous, current, {
            ignoreFields: ['updatedAt'],
        });
        expect(changes).toHaveLength(0);
    });

    it('handles mixed CREATE/UPDATE/DELETE in one diff', () => {
        const previous = [make({ id: '1' }), make({ id: '2', name: 'Old' })];
        const current = [make({ id: '2', name: 'New' }), make({ id: '3' })];
        const changes = detectChanges<Course>('course', previous, current);
        const byId = new Map(changes.map((c) => [c.entityId, c.action]));
        expect(byId.get('1')).toBe('deleted');
        expect(byId.get('2')).toBe('updated');
        expect(byId.get('3')).toBe('created');
    });
});
