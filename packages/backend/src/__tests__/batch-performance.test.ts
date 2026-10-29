import { test, expect, spyOn } from 'bun:test';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryTimetableEventStorage } from '../testing/memory-event-storage.adapter';
import { InMemoryRoomStorage } from '../testing/memory-room-storage.adapter';
import { InMemoryGroupStorage } from '../testing/memory-group-storage.adapter';
import { InMemoryAvailabilityStorage } from '../testing/memory-availability-storage.adapter';
import { createTestEvent, createTestException, createTestRoom, createTestAvailability } from '../testing/factories';
import { QueryService } from '../domain/query.service';
import { ConflictService } from '../domain/conflict.service';
import { AvailabilityService } from '../domain/availability.service';
import { RecurrenceService } from '../domain/recurrence.service';
import { TimeService } from '../domain/time.service';
import { CapacityConstraint } from '../constraints/capacity.constraint';
import { OverlapConstraint } from '../constraints/overlap.constraint';
import { AvailabilityConstraint } from '../constraints/availability.constraint';

const range = { start: new Date('2026-03-01'), end: new Date('2026-04-01') };
test('exceptions are chunked, cancellation is preserved, and legacy results match', async () => {
    const storage = new InMemoryTimetableEventStorage();
    for (let i = 0; i < 401; i++) {
        const event = await storage.create(createTestEvent({ recurrenceRule: "FREQ=DAILY;COUNT=1" }));
        if (!i) await storage.createException(createTestException({ eventId: event.id, originalDate: event.startTime }));
    }
    const batch = spyOn(storage, 'findExceptionsBatch');
    const service = new QueryService(storage, new RecurrenceService(), new TimeService());
    const result = await service.getSchedule({ dateRange: range });
    expect(result).toHaveLength(400);
    expect(batch.mock.calls.map(args => args[0].length)).toEqual([200, 200, 1]);
    Object.defineProperty(storage, 'findExceptionsBatch', { value: undefined });
    expect(await service.getSchedule({ dateRange: range })).toEqual(result);
});

test('recurring constraints batch relations and capacity reads once per invocation', async () => {
    const events = new InMemoryTimetableEventStorage();
    const rooms = new InMemoryRoomStorage();
    const groups = new InMemoryGroupStorage();
    const rules = new InMemoryAvailabilityStorage();
    const room = await rooms.create(createTestRoom({ capacity: 1 }));
    const event = await events.create(createTestEvent({ roomId: room.id, recurrenceRule: 'FREQ=DAILY;COUNT=20' }));
    await events.addInstructor({ eventId: event.id, instructorId: 'teacher' });
    await events.addGroup({ eventId: event.id, groupId: 'group' });
    await groups.addStudent({ groupId: 'group', studentId: 'a' });
    await groups.addStudent({ groupId: 'group', studentId: 'b' });
    await rules.create(createTestAvailability({ entityType: 'room', entityId: room.id, type: 'blocked', hardness: 'hard' }));
    const reads = [spyOn(events, 'findExceptionsBatch'), spyOn(events, 'findInstructorsBatch'), spyOn(events, 'findGroupsBatch'), spyOn(rooms, 'findByIds'), spyOn(groups, 'findStudentsBatch'), spyOn(rules, 'findByEntities')];
    const recurrence = new RecurrenceService();
    const service = new ConflictService(new TimeService(), new AvailabilityService(rules, recurrence, new EventEmitter2()), events, rooms, groups, recurrence, new EventEmitter2(), [new OverlapConstraint(), new CapacityConstraint(), new AvailabilityConstraint()]);
    const result = await service.check(event, range);
    expect(result.conflicts.filter(c => c.type === 'room-over-capacity')).toHaveLength(20);
    expect(result.conflicts.filter(c => c.type === 'availability-violation')).toHaveLength(1);
    for (const read of reads) expect(read).toHaveBeenCalledTimes(1);
    await service.check(event, range);
    for (const read of reads) expect(read).toHaveBeenCalledTimes(2);
    for (const [object, name] of [[events, 'findExceptionsBatch'], [events, 'findInstructorsBatch'], [events, 'findGroupsBatch'], [rooms, 'findByIds'], [groups, 'findStudentsBatch'], [rules, 'findByEntities']] as const) Object.defineProperty(object, name, { value: undefined });
    expect(await service.check(event, range)).toEqual(result);
});
test('availability snapshot retains specific-date and hard/soft precedence', async () => {
    const storage = new InMemoryAvailabilityStorage();
    const start = new Date('2026-03-02T09:00:00Z');
    await storage.create(createTestAvailability({ entityId: 'r', entityType: 'room', type: 'blocked', hardness: 'soft' }));
    await storage.create(createTestAvailability({ entityId: 'r', entityType: 'room', type: 'blocked', hardness: 'hard', specificDate: start }));
    const service = new AvailabilityService(storage, new RecurrenceService(), new EventEmitter2());
    const check = service.createChecker([{ entityType: 'room', entityId: 'r' }]);
    for (const date of [start, new Date('2026-03-02T10:00:00Z')]) {
        expect(await check('room', 'r', date, 60)).toEqual(await service.isAvailable('room', 'r', date, 60));
    }
});
