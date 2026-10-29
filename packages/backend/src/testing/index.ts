// In-memory adapters

// Error classes (re-exported for ergonomic test assertions like `expect(...).toThrow(EntityNotFoundError)`)
export {
    COURSEKIT_ERROR_CODES,
    ConstraintViolationError,
    CourseKitError,
    type CourseKitErrorCode,
    EntityNotFoundError,
    InvalidRRuleError,
    StorageError,
    VersionConflictError,
} from '../errors/index.js';
export {
    expectConflict,
    expectConflictCount,
    expectConflictInvolves,
    expectNoConflicts,
} from './assertions.js';
// Test helpers
export { EventSpy } from './event-spy.js';
// Factories
export {
    createTestAvailability,
    createTestCourse,
    createTestEvent,
    createTestException,
    createTestGroup,
    createTestInstructor,
    createTestPeriod,
    createTestRoom,
} from './factories.js';
// Fixtures
export { edgeCaseSchedule, simpleSchoolWeek, universitySemester } from './fixtures.js';
export { InMemoryAvailabilityStorage } from './memory-availability-storage.adapter.js';
export { InMemoryCourseStorage } from './memory-course-storage.adapter.js';
export { InMemoryTimetableEventStorage } from './memory-event-storage.adapter.js';
export { InMemoryGroupStorage } from './memory-group-storage.adapter.js';
export { InMemoryInstructorStorage } from './memory-instructor-storage.adapter.js';
export { InMemoryLocationDistanceStorage } from './memory-location-distance-storage.adapter.js';
export { InMemoryAcademicPeriodStorage } from './memory-period-storage.adapter.js';
export { InMemoryRoomStorage } from './memory-room-storage.adapter.js';
