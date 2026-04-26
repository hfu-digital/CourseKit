// Parser

// Change detection
export {
    type ChangeAction,
    type ChangeRecord,
    type DetectChangesOptions,
    detectChanges,
} from './changes/change-detector.js';
// Client
export {
    StarPlanClient,
    type StarPlanClientOptions,
    type StarPlanProgram,
    type StarPlanSemester,
} from './client/starplan-client.js';
export { extractInstructor, type InstructorExtractorConfig } from './extract/instructor.js';
// Extractors (parameterized; default to HFU patterns)
export { type ExtractedRoom, extractRoom, type RoomExtractorConfig } from './extract/room.js';
// Identity
export { generateContentHash, hashIcalFeed } from './identity/content-hash.js';
export {
    groupBySchedule,
    groupBySummary,
    type ParsedVEvent,
    type ParseIcalOptions,
    parseIcal,
} from './parser/ical.js';

// Recurrence
export {
    isValidRrule,
    type NormalizedRecurrence,
    normalizeRrule,
} from './recurrence/rrule-expander.js';
// Study blocks
export {
    getStudyBlockFromTime,
    getStudyBlockTimeRange,
    HFU_STUDY_BLOCK_CONFIG,
    HFU_STUDY_BLOCKS,
    type StudyBlock,
    type StudyBlockConfig,
} from './study-blocks/index.js';

// Utilities
export { type FetchWithCharsetOptions, fetchWithCharset } from './utils/fetch-with-charset.js';
