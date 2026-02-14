// In-memory adapters
export { InMemoryTimetableEventStorage } from './memory-event-storage.adapter.js';
export { InMemoryRoomStorage } from './memory-room-storage.adapter.js';
export { InMemoryInstructorStorage } from './memory-instructor-storage.adapter.js';
export { InMemoryGroupStorage } from './memory-group-storage.adapter.js';
export { InMemoryAvailabilityStorage } from './memory-availability-storage.adapter.js';
export { InMemoryAcademicPeriodStorage } from './memory-period-storage.adapter.js';
export { InMemoryCourseStorage } from './memory-course-storage.adapter.js';

// Factories
export {
    createTestEvent,
    createTestException,
    createTestRoom,
    createTestInstructor,
    createTestGroup,
    createTestCourse,
    createTestAvailability,
    createTestPeriod,
} from './factories.js';

// Fixtures
export { simpleSchoolWeek, universitySemester, edgeCaseSchedule } from './fixtures.js';

// Test helpers
export { EventSpy } from './event-spy.js';
export { expectNoConflicts, expectConflict, expectConflictCount, expectConflictInvolves } from './assertions.js';
