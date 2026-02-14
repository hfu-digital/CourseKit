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

        // For each occurrence with a room, check that the assigned groups fit
        for (const occ of occurrences) {
            if (!occ.roomId) continue;

            const groupIds = await context.getGroupsForEvent(occ.eventId);
            if (groupIds.length === 0) continue;

            // Room capacity check requires room data in metadata
            // Since we don't have direct access to RoomStorage here,
            // we check if room capacity info is available in event metadata
            const roomCapacity = occ.metadata?.roomCapacity as number | undefined;
            const totalStudents = occ.metadata?.totalStudents as number | undefined;

            if (roomCapacity !== undefined && totalStudents !== undefined && totalStudents > roomCapacity) {
                conflicts.push({
                    id: `capacity-${occ.roomId}-${occ.eventId}-${occ.occurrenceDate.getTime()}`,
                    type: 'room-over-capacity',
                    severity: 'warning',
                    message: `Room ${occ.roomId} has capacity ${roomCapacity} but event ${occ.eventId} has ${totalStudents} students`,
                    involvedEventIds: [occ.eventId],
                    involvedEntityIds: [occ.roomId, ...groupIds],
                    metadata: {
                        roomCapacity,
                        totalStudents,
                        excess: totalStudents - roomCapacity,
                    },
                });
            }
        }

        return conflicts;
    }
}
