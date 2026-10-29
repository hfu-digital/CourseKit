import { CourseKitModule } from '@hfu.digital/coursekit-nestjs';
import {
    InMemoryAcademicPeriodStorage,
    InMemoryAvailabilityStorage,
    InMemoryCourseStorage,
    InMemoryGroupStorage,
    InMemoryInstructorStorage,
    InMemoryRoomStorage,
    InMemoryTimetableEventStorage,
} from '@hfu.digital/coursekit-nestjs/testing';
import { Module } from '@nestjs/common';
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
