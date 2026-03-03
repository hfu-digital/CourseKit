/**
 * Utilities for deduplicating raw SPlan API course results.
 *
 * The SPlan API returns one row per scheduled occurrence, so a course that
 * meets every Monday and Thursday appears as two rows with the same summary.
 * These helpers group rows by course name and aggregate unique schedule slots.
 */

export interface RawSplanCourse {
    id: string;
    summary: string;
    /** ISO datetime string */
    startTime: string;
    /** ISO datetime string */
    endTime: string;
    weekday: number;
    room?: { id: string; name: string; building?: string };
    instructor?: { id: string; name: string };
    semester?: {
        id: string;
        name: string;
        program?: { id: string; name: string };
    };
}

export interface CourseSchedule {
    dayOfWeek: number;
    /** HH:MM */
    startTime: string;
    /** HH:MM */
    endTime: string;
    room?: string;
}

export interface DedupedCourse {
    id: string;
    name: string;
    instructor?: string;
    schedules: CourseSchedule[];
}

export interface DedupedTeacherCourse extends DedupedCourse {
    program?: string;
    semester?: number;
}

function isoToHHMM(isoTime: string): string {
    return new Date(isoTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function extractSemesterNumber(name: string): number | undefined {
    const match = name.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Collapse a flat list of raw SPlan course rows into deduplicated courses,
 * each with a list of unique schedule slots.
 *
 * Suitable for program/semester endpoints that return course occurrences.
 */
export function deduplicateProgramCourses(data: RawSplanCourse[]): DedupedCourse[] {
    const courseMap = new Map<string, DedupedCourse & { scheduleKeys: Set<string> }>();

    for (const course of data) {
        const key = course.summary;

        if (!courseMap.has(key)) {
            courseMap.set(key, {
                id: course.id,
                name: course.summary,
                instructor: course.instructor?.name,
                schedules: [],
                scheduleKeys: new Set(),
            });
        }

        const existing = courseMap.get(key)!;
        const startTime = isoToHHMM(course.startTime);
        const endTime = isoToHHMM(course.endTime);
        const roomName = course.room?.name;
        const scheduleKey = `${course.weekday}-${startTime}-${endTime}-${roomName ?? ''}`;

        if (!existing.scheduleKeys.has(scheduleKey)) {
            existing.scheduleKeys.add(scheduleKey);
            existing.schedules.push({ dayOfWeek: course.weekday, startTime, endTime, room: roomName });
        }
    }

    return Array.from(courseMap.values()).map(({ scheduleKeys: _keys, ...course }) => course);
}

/**
 * Collapse a flat list of raw SPlan course rows into deduplicated teacher
 * courses, preserving program and semester metadata from the first occurrence.
 *
 * Suitable for instructor course endpoints.
 */
export function deduplicateTeacherCourses(data: RawSplanCourse[]): DedupedTeacherCourse[] {
    const courseMap = new Map<string, DedupedTeacherCourse & { scheduleKeys: Set<string> }>();

    for (const course of data) {
        const key = course.summary;

        if (!courseMap.has(key)) {
            courseMap.set(key, {
                id: course.id,
                name: course.summary,
                program: course.semester?.program?.name,
                semester: course.semester?.name
                    ? extractSemesterNumber(course.semester.name)
                    : undefined,
                schedules: [],
                scheduleKeys: new Set(),
            });
        }

        const existing = courseMap.get(key)!;
        const startTime = isoToHHMM(course.startTime);
        const endTime = isoToHHMM(course.endTime);
        const roomName = course.room?.name;
        const scheduleKey = `${course.weekday}-${startTime}-${endTime}-${roomName ?? ''}`;

        if (!existing.scheduleKeys.has(scheduleKey)) {
            existing.scheduleKeys.add(scheduleKey);
            existing.schedules.push({ dayOfWeek: course.weekday, startTime, endTime, room: roomName });
        }
    }

    return Array.from(courseMap.values()).map(({ scheduleKeys: _keys, ...course }) => course);
}
