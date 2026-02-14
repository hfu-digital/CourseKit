import type { TimetableEvent, Room, Instructor, Group } from '../interfaces/types.js';
import { createTestEvent, createTestRoom, createTestInstructor, createTestGroup } from './factories.js';

export interface FixtureData {
    events: TimetableEvent[];
    rooms: Room[];
    instructors: Instructor[];
    groups: Group[];
}

/**
 * Simple school week: 5 daily lectures, Mon-Fri, single room and instructor.
 */
export function simpleSchoolWeek(): FixtureData {
    const room = createTestRoom({ name: 'Lecture Hall 1', capacity: 100 });
    const instructor = createTestInstructor({ name: 'Prof. Smith' });
    const group = createTestGroup({ name: 'CS Freshmen', maxCapacity: 80 });

    const events: TimetableEvent[] = [];
    const baseDate = new Date('2026-03-02T09:00:00Z'); // Monday

    for (let day = 0; day < 5; day++) {
        const startTime = new Date(baseDate);
        startTime.setDate(startTime.getDate() + day);

        events.push(createTestEvent({
            title: `CS101 Lecture - Day ${day + 1}`,
            startTime,
            durationMin: 90,
            roomId: room.id,
        }));
    }

    return { events, rooms: [room], instructors: [instructor], groups: [group] };
}

/**
 * University semester with potential conflicts:
 * - Two instructors, three rooms
 * - Overlapping events to test conflict detection
 */
export function universitySemester(): FixtureData {
    const rooms = [
        createTestRoom({ name: 'A101', building: 'A', capacity: 30 }),
        createTestRoom({ name: 'A102', building: 'A', capacity: 50 }),
        createTestRoom({ name: 'B201', building: 'B', capacity: 100 }),
    ];

    const instructors = [
        createTestInstructor({ name: 'Prof. Mueller' }),
        createTestInstructor({ name: 'Prof. Weber' }),
    ];

    const groups = [
        createTestGroup({ name: 'IN1', type: 'fixed', maxCapacity: 25 }),
        createTestGroup({ name: 'IN2', type: 'fixed', maxCapacity: 25 }),
        createTestGroup({ name: 'WI1', type: 'fixed', maxCapacity: 40 }),
    ];

    const events: TimetableEvent[] = [
        // Monday 9:00 - Prof Mueller in A101
        createTestEvent({
            title: 'Programming I',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            roomId: rooms[0].id,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
        }),
        // Monday 9:00 - Prof Mueller in A102 (CONFLICT: instructor double-book)
        createTestEvent({
            title: 'Databases',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            roomId: rooms[1].id,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
        }),
        // Monday 10:00 - Overlaps with above (CONFLICT: room overlap for A101)
        createTestEvent({
            title: 'Mathematics',
            startTime: new Date('2026-03-02T10:00:00Z'),
            durationMin: 90,
            roomId: rooms[0].id,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
        }),
        // Tuesday 14:00 - No conflicts
        createTestEvent({
            title: 'Software Engineering',
            startTime: new Date('2026-03-03T14:00:00Z'),
            durationMin: 120,
            roomId: rooms[2].id,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
        }),
    ];

    return { events, rooms, instructors, groups };
}

/**
 * Edge case schedule: non-recurring events, cancelled exceptions.
 */
export function edgeCaseSchedule(): FixtureData {
    const room = createTestRoom({ name: 'Seminar Room', capacity: 15 });
    const instructor = createTestInstructor({ name: 'Dr. Edge' });
    const group = createTestGroup({ name: 'Edge Cases', maxCapacity: 10 });

    const events: TimetableEvent[] = [
        // Single non-recurring event
        createTestEvent({
            title: 'One-time Workshop',
            startTime: new Date('2026-03-15T10:00:00Z'),
            durationMin: 180,
            roomId: room.id,
        }),
        // Zero-boundary: event starts exactly when another ends
        createTestEvent({
            title: 'Back-to-back A',
            startTime: new Date('2026-03-16T09:00:00Z'),
            durationMin: 60,
            roomId: room.id,
        }),
        createTestEvent({
            title: 'Back-to-back B',
            startTime: new Date('2026-03-16T10:00:00Z'),
            durationMin: 60,
            roomId: room.id,
        }),
    ];

    return { events, rooms: [room], instructors: [instructor], groups: [group] };
}
