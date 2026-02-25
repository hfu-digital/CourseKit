import { Module } from '@nestjs/common';
import { CourseKitModule } from '@hfu.digital/coursekit-nestjs';
import {
    InMemoryTimetableEventStorage,
    InMemoryRoomStorage,
    InMemoryInstructorStorage,
    InMemoryGroupStorage,
    InMemoryAvailabilityStorage,
    InMemoryAcademicPeriodStorage,
    InMemoryCourseStorage,
} from '@hfu.digital/coursekit-nestjs/testing';
import { DemoService } from './demo.service.js';

@Module({
    imports: [
        CourseKitModule.register({
            eventStorage: new InMemoryTimetableEventStorage(),
            roomStorage: new InMemoryRoomStorage(),
            instructorStorage: new InMemoryInstructorStorage(),
            groupStorage: new InMemoryGroupStorage(),
            availabilityStorage: new InMemoryAvailabilityStorage(),
            periodStorage: new InMemoryAcademicPeriodStorage(),
            courseStorage: new InMemoryCourseStorage(),
        }),
    ],
    providers: [DemoService],
})
export class AppModule {}
