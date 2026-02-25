import { Injectable } from '@nestjs/common';
import { ScheduleConstraint } from '../interfaces/constraint.interface.js';
import type { ConstraintContext } from '../interfaces/constraint.interface.js';
import type { MaterializedOccurrence, Conflict } from '../interfaces/types.js';

@Injectable()
export class CapacityConstraint extends ScheduleConstraint {
    readonly type = 'capacity';
    readonly description = 'Checks room capacity against group size';

    async evaluate(
        occurrences: MaterializedOccurrence[],
        context: ConstraintContext,
    ): Promise<Conflict[]> {
        const conflicts: Conflict[] = [];

        for (const occ of occurrences) {
            if (!occ.roomId) continue;

            const groupIds = await context.getGroupsForEvent(occ.eventId);
            if (groupIds.length === 0) continue;

            const room = await context.getRoomById(occ.roomId);
            if (!room || room.capacity === 0) continue;

            let totalStudents = 0;
            for (const groupId of groupIds) {
                totalStudents += await context.getGroupStudentCount(groupId);
            }

            if (totalStudents > room.capacity) {
                conflicts.push({
                    id: `capacity-${occ.roomId}-${occ.eventId}-${occ.occurrenceDate.getTime()}`,
                    type: 'room-over-capacity',
                    severity: 'warning',
                    message: `Room ${room.name} has capacity ${room.capacity} but event has ${totalStudents} students`,
                    involvedEventIds: [occ.eventId],
                    involvedEntityIds: [occ.roomId, ...groupIds],
                    metadata: {
                        roomCapacity: room.capacity,
                        totalStudents,
                        excess: totalStudents - room.capacity,
                    },
                });
            }
        }

        return conflicts;
    }
}
