// Module
export { CourseKitModule, type CourseKitModuleOptions } from './module.js';

// Domain services
export { RecurrenceService } from './domain/recurrence.service.js';
export { TimeService } from './domain/time.service.js';
export { AvailabilityService } from './domain/availability.service.js';
export { ConflictService } from './domain/conflict.service.js';
export { QueryService } from './domain/query.service.js';

// Storage interfaces (for custom adapter authors)
export { TimetableEventStorage } from './interfaces/event-storage.interface.js';
export { RoomStorage } from './interfaces/room-storage.interface.js';
export { InstructorStorage } from './interfaces/instructor-storage.interface.js';
export { GroupStorage } from './interfaces/group-storage.interface.js';
export { AvailabilityStorage } from './interfaces/availability-storage.interface.js';
export { AcademicPeriodStorage } from './interfaces/period-storage.interface.js';
export { CourseStorage } from './interfaces/course-storage.interface.js';
export { LocationDistanceStorage } from './interfaces/location-distance-storage.interface.js';
export { ScheduleConstraint, type ConstraintContext } from './interfaces/constraint.interface.js';

// Prisma adapters
export { PrismaTimetableEventAdapter } from './adapters/prisma-event.adapter.js';
export { PrismaRoomAdapter } from './adapters/prisma-room.adapter.js';
export { PrismaInstructorAdapter } from './adapters/prisma-instructor.adapter.js';
export { PrismaGroupAdapter } from './adapters/prisma-group.adapter.js';
export { PrismaAvailabilityAdapter } from './adapters/prisma-availability.adapter.js';
export { PrismaAcademicPeriodAdapter } from './adapters/prisma-period.adapter.js';
export { PrismaCourseAdapter } from './adapters/prisma-course.adapter.js';
export { PrismaLocationDistanceAdapter } from './adapters/prisma-location-distance.adapter.js';

// Types (everything consumers need for type safety)
export type * from './interfaces/types.js';

// Domain events (for typed subscribers)
export { DOMAIN_EVENTS } from './interfaces/domain-events.interface.js';
export type * from './interfaces/domain-events.interface.js';

// DTOs
export { CreateEventDto } from './dto/create-event.dto.js';
export { UpdateEventDto } from './dto/update-event.dto.js';
export { CreateExceptionDto } from './dto/create-exception.dto.js';
export { CreateAvailabilityDto } from './dto/create-availability.dto.js';
export { QueryFilterDto } from './dto/query-filter.dto.js';
export { CreateRoomDto, CreateInstructorDto, CreateGroupDto, CreateCourseDto } from './dto/create-entity.dto.js';
