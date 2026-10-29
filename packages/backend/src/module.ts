import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AvailabilityConstraint } from './constraints/availability.constraint.js';
import { CapacityConstraint } from './constraints/capacity.constraint.js';
// Built-in constraints
import { OverlapConstraint } from './constraints/overlap.constraint.js';
import { AvailabilityService } from './domain/availability.service.js';
import { ConflictService } from './domain/conflict.service.js';
import { QueryService } from './domain/query.service.js';
// Domain services
import { RecurrenceService } from './domain/recurrence.service.js';
import { TimeService } from './domain/time.service.js';
import { AvailabilityStorage } from './interfaces/availability-storage.interface.js';
import type { ScheduleConstraint } from './interfaces/constraint.interface.js';
import { CourseStorage } from './interfaces/course-storage.interface.js';
// Storage interfaces
import { TimetableEventStorage } from './interfaces/event-storage.interface.js';
import { GroupStorage } from './interfaces/group-storage.interface.js';
import { InstructorStorage } from './interfaces/instructor-storage.interface.js';
import { LocationDistanceStorage } from './interfaces/location-distance-storage.interface.js';
import { AcademicPeriodStorage } from './interfaces/period-storage.interface.js';
import { RoomStorage } from './interfaces/room-storage.interface.js';

export interface CourseKitModuleOptions {
    eventStorage: TimetableEventStorage;
    roomStorage: RoomStorage;
    instructorStorage: InstructorStorage;
    groupStorage: GroupStorage;
    availabilityStorage: AvailabilityStorage;
    periodStorage: AcademicPeriodStorage;
    courseStorage: CourseStorage;
    locationDistanceStorage?: LocationDistanceStorage;
    /** Additional custom constraints beyond the built-ins */
    constraints?: ScheduleConstraint[];
    /** Set false to disable built-in constraints (default: true) */
    enableBuiltInConstraints?: boolean;
}

@Module({})
export class CourseKitModule {
    static register(options: CourseKitModuleOptions): DynamicModule {
        const builtInConstraints: ScheduleConstraint[] =
            options.enableBuiltInConstraints !== false
                ? [new OverlapConstraint(), new CapacityConstraint(), new AvailabilityConstraint()]
                : [];

        const allConstraints = [...builtInConstraints, ...(options.constraints ?? [])];

        const storageProviders: Provider[] = [
            { provide: TimetableEventStorage, useValue: options.eventStorage },
            { provide: RoomStorage, useValue: options.roomStorage },
            { provide: InstructorStorage, useValue: options.instructorStorage },
            { provide: GroupStorage, useValue: options.groupStorage },
            { provide: AvailabilityStorage, useValue: options.availabilityStorage },
            { provide: AcademicPeriodStorage, useValue: options.periodStorage },
            { provide: CourseStorage, useValue: options.courseStorage },
            { provide: 'SCHEDULE_CONSTRAINTS', useValue: allConstraints },
        ];

        if (options.locationDistanceStorage) {
            storageProviders.push({
                provide: LocationDistanceStorage,
                useValue: options.locationDistanceStorage,
            });
        }

        return {
            module: CourseKitModule,
            imports: [EventEmitterModule.forRoot()],
            providers: [
                ...storageProviders,
                RecurrenceService,
                TimeService,
                AvailabilityService,
                ConflictService,
                QueryService,
            ],
            exports: [
                RecurrenceService,
                TimeService,
                AvailabilityService,
                ConflictService,
                QueryService,
                TimetableEventStorage,
                RoomStorage,
                InstructorStorage,
                GroupStorage,
                AvailabilityStorage,
                AcademicPeriodStorage,
                CourseStorage,
            ],
        };
    }
}
