export { CourseKitProvider, useCourseKitConfig, type CourseKitConfig } from './context/CourseKitProvider.js';
export { useTimetable, type TimetableQuery, type TimetableOccurrence, type UseTimetableResult } from './hooks/useTimetable.js';
export { useAvailability, type AvailabilityQuery, type AvailabilitySlot, type UseAvailabilityResult } from './hooks/useAvailability.js';
export { useConflictCheck, type ProposedEvent, type ConflictInfo, type ConflictCheckResult, type UseConflictCheckResult } from './hooks/useConflictCheck.js';
export { useMutation, type MutationOptions, type UseMutationResult } from './hooks/useMutation.js';
export { useRoomSearch, type RoomSearchQuery, type RoomResult, type UseRoomSearchResult } from './hooks/useRoomSearch.js';
export { TimetableGrid, type TimetableGridProps } from './components/TimetableGrid.js';
export { EventCard, type EventCardProps } from './components/EventCard.js';
export { ConflictBadge, type ConflictBadgeProps } from './components/ConflictBadge.js';
export { AvailabilityOverlay, type AvailabilityOverlayProps, type AvailabilityBlock } from './components/AvailabilityOverlay.js';
export { StudyBlockGrid, type StudyBlockGridProps, type StudyBlockEvent } from './components/StudyBlockGrid.js';

// HFU block system utilities
export {
    STUDY_BLOCKS,
    DAYS_OF_WEEK,
    DAYS_OF_WEEK_SHORT,
    timeToMinutes,
    getStudyBlockFromTime,
    getWeekStart,
    getEventHeight,
    type StudyBlock,
} from './utils/hfu-blocks.js';

// SPlan course deduplication utilities
export {
    deduplicateProgramCourses,
    deduplicateTeacherCourses,
    type RawSplanCourse,
    type CourseSchedule,
    type DedupedCourse,
    type DedupedTeacherCourse,
} from './utils/splan-dedup.js';
