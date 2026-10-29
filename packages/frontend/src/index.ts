export {
    type AvailabilityBlock,
    AvailabilityOverlay,
    type AvailabilityOverlayProps,
} from './components/AvailabilityOverlay.js';
export { ConflictBadge, type ConflictBadgeProps } from './components/ConflictBadge.js';
export { EventCard, type EventCardProps } from './components/EventCard.js';
export {
    type StudyBlockEvent,
    StudyBlockGrid,
    type StudyBlockGridProps,
} from './components/StudyBlockGrid.js';
export { TimetableGrid, type TimetableGridProps } from './components/TimetableGrid.js';
export {
    type CourseKitConfig,
    CourseKitProvider,
    useCourseKitConfig,
} from './context/CourseKitProvider.js';
export {
    type AvailabilityQuery,
    type AvailabilitySlot,
    type UseAvailabilityResult,
    useAvailability,
} from './hooks/useAvailability.js';
export {
    type ChangeAction,
    type ChangeEntityType,
    type ChangeRecord,
    type ChangesQuery,
    type UseChangesResult,
    useChanges,
} from './hooks/useChanges.js';
export {
    type ConflictCheckResult,
    type ConflictInfo,
    type ProposedEvent,
    type UseConflictCheckResult,
    useConflictCheck,
} from './hooks/useConflictCheck.js';
export {
    type CourseSubscription,
    type CourseSubscriptionVariant,
    type UseCourseSubscriptionsResult,
    useCourseSubscriptions,
} from './hooks/useCourseSubscriptions.js';
export { type MutationOptions, type UseMutationResult, useMutation } from './hooks/useMutation.js';
export {
    type RoomResult,
    type RoomSearchQuery,
    type UseRoomSearchResult,
    useRoomSearch,
} from './hooks/useRoomSearch.js';
export { type Semester, type UseSemesterResult, useSemester } from './hooks/useSemester.js';
export {
    type TimetableOccurrence,
    type TimetableQuery,
    type UseTimetableResult,
    useTimetable,
} from './hooks/useTimetable.js';

// HFU block system utilities
export {
    DAYS_OF_WEEK,
    DAYS_OF_WEEK_SHORT,
    getEventHeight,
    getStudyBlockFromTime,
    getWeekStart,
    STUDY_BLOCKS,
    type StudyBlock,
    timeToMinutes,
} from './utils/hfu-blocks.js';
