import {
    ConflictService,
    QueryService,
    RecurrenceService,
    RoomStorage,
    TimetableEventStorage,
} from '@hfu.digital/coursekit-nestjs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DemoService {
    constructor(
        private readonly recurrence: RecurrenceService,
        private readonly query: QueryService,
        private readonly conflicts: ConflictService,
        private readonly eventStorage: TimetableEventStorage,
        private readonly roomStorage: RoomStorage,
    ) {}

    async run() {
        console.log('=== CourseKit Basic Example ===\n');

        // 1. Create a room
        const room = await this.roomStorage.create({
            name: 'Lecture Hall A',
            building: 'Main Building',
            campus: 'Downtown',
            capacity: 100,
            tags: null,
        });
        console.log(`Created room: ${room.name} (capacity: ${room.capacity})`);

        // 2. Create a weekly recurring lecture
        const lecture = await this.eventStorage.create({
            title: 'Introduction to Computer Science',
            startTime: new Date('2026-03-02T09:00:00Z'),
            durationMin: 90,
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=14',
            metadata: null,
            courseId: null,
            roomId: room.id,
            periodId: null,
        });
        console.log(`Created recurring lecture: ${lecture.title}`);

        // 3. Create a one-off workshop that overlaps
        const workshop = await this.eventStorage.create({
            title: 'Programming Workshop',
            startTime: new Date('2026-03-02T10:00:00Z'),
            durationMin: 120,
            recurrenceRule: null,
            metadata: null,
            courseId: null,
            roomId: room.id,
            periodId: null,
        });
        console.log(`Created workshop: ${workshop.title}`);

        // 4. Materialize the lecture for March
        const dateRange = {
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-31T23:59:59Z'),
        };
        const exceptions = await this.eventStorage.findExceptions(lecture.id);
        const occurrences = this.recurrence.materialize(lecture, exceptions, dateRange);
        console.log(`\nMaterialized ${occurrences.length} lecture occurrences in March:`);
        for (const occ of occurrences) {
            console.log(`  - ${occ.startTime.toISOString()} (${occ.durationMin} min)`);
        }

        // 5. Check for conflicts
        console.log('\nRunning conflict detection...');
        const result = await this.conflicts.check(workshop, dateRange);
        if (result.conflicts.length > 0) {
            console.log(`Found ${result.conflicts.length} conflict(s):`);
            for (const conflict of result.conflicts) {
                console.log(`  - [${conflict.severity}] ${conflict.message}`);
            }
        } else {
            console.log('No conflicts detected.');
        }

        // 6. Find free slots
        console.log('\nFinding free 60-min slots for the room on March 2...');
        const dayRange = {
            start: new Date('2026-03-02T08:00:00Z'),
            end: new Date('2026-03-02T18:00:00Z'),
        };
        const freeSlots = await this.query.findFreeSlots({
            dateRange: dayRange,
            durationMin: 60,
            entityIds: [{ type: 'room', id: room.id }],
        });
        for (const slot of freeSlots) {
            console.log(
                `  - ${slot.start.toISOString()} to ${slot.end.toISOString()} (${slot.durationMin} min)`,
            );
        }

        console.log('\n=== Done ===');
    }
}
