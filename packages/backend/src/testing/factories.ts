import type {
    TimetableEvent, EventException, Room, Instructor, Group,
    Course, Availability, AcademicPeriod,
} from '../interfaces/types.js';

type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };

/** Create a test TimetableEvent with sensible defaults */
export function createTestEvent(overrides: DeepPartial<TimetableEvent> = {}): TimetableEvent {
    return {
        id: crypto.randomUUID(),
        title: 'Test Lecture',
        startTime: new Date('2026-03-02T09:00:00Z'),
        durationMin: 90,
        recurrenceRule: null,
        metadata: null,
        courseId: null,
        roomId: null,
        periodId: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as TimetableEvent;
}

/** Create a test EventException with sensible defaults */
export function createTestException(overrides: DeepPartial<EventException> = {}): EventException {
    return {
        id: crypto.randomUUID(),
        eventId: crypto.randomUUID(),
        originalDate: new Date('2026-03-09T09:00:00Z'),
        type: 'cancelled',
        newStartTime: null,
        newDurationMin: null,
        newRoomId: null,
        metadata: null,
        ...overrides,
    } as EventException;
}

/** Create a test Room with sensible defaults */
export function createTestRoom(overrides: DeepPartial<Room> = {}): Room {
    return {
        id: crypto.randomUUID(),
        name: 'Room A101',
        building: 'Building A',
        campus: 'Main Campus',
        capacity: 30,
        tags: null,
        ...overrides,
    } as Room;
}

/** Create a test Instructor with sensible defaults */
export function createTestInstructor(overrides: DeepPartial<Instructor> = {}): Instructor {
    return {
        id: crypto.randomUUID(),
        name: 'Prof. Test',
        email: 'test@hfu.digital',
        tags: null,
        ...overrides,
    } as Instructor;
}

/** Create a test Group with sensible defaults */
export function createTestGroup(overrides: DeepPartial<Group> = {}): Group {
    return {
        id: crypto.randomUUID(),
        name: 'Group A',
        type: 'fixed',
        maxCapacity: 30,
        ...overrides,
    } as Group;
}

/** Create a test Course with sensible defaults */
export function createTestCourse(overrides: DeepPartial<Course> = {}): Course {
    return {
        id: crypto.randomUUID(),
        name: 'Introduction to CS',
        code: 'CS101',
        parentId: null,
        metadata: null,
        ...overrides,
    } as Course;
}

/** Create a test Availability with sensible defaults */
export function createTestAvailability(overrides: DeepPartial<Availability> = {}): Availability {
    return {
        id: crypto.randomUUID(),
        entityType: 'instructor',
        entityId: crypto.randomUUID(),
        dayOfWeek: null,
        specificDate: null,
        startTime: new Date('2026-03-02T08:00:00Z'),
        endTime: new Date('2026-03-02T17:00:00Z'),
        type: 'available',
        hardness: 'hard',
        priority: 0,
        recurrenceRule: null,
        ...overrides,
    } as Availability;
}

/** Create a test AcademicPeriod with sensible defaults */
export function createTestPeriod(overrides: DeepPartial<AcademicPeriod> = {}): AcademicPeriod {
    return {
        id: crypto.randomUUID(),
        name: 'Winter Semester 2026',
        type: 'semester',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2027-03-31'),
        parentId: null,
        ...overrides,
    } as AcademicPeriod;
}
