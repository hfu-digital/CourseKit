import { Injectable } from '@nestjs/common';
import { ScheduleConstraint } from '../interfaces/constraint.interface.js';
import type { ConstraintContext } from '../interfaces/constraint.interface.js';
import type { MaterializedOccurrence, Conflict, AvailabilityEntityType } from '../interfaces/types.js';

@Injectable()
export class AvailabilityConstraint extends ScheduleConstraint {
    readonly type = 'availability';
    readonly description = 'Checks events against entity availability rules';

    async evaluate(
        occurrences: MaterializedOccurrence[],
        context: ConstraintContext,
    ): Promise<Conflict[]> {
        const conflicts: Conflict[] = [];

        for (const occ of occurrences) {
            const entitiesToCheck: Array<{ type: AvailabilityEntityType; id: string }> = [];

            // Check room availability
            if (occ.roomId) {
                entitiesToCheck.push({ type: 'room', id: occ.roomId });
            }

            // Check instructor availability
            const instructorIds = await context.getInstructorsForEvent(occ.eventId);
            for (const instructorId of instructorIds) {
                entitiesToCheck.push({ type: 'instructor', id: instructorId });
            }

            for (const entity of entitiesToCheck) {
                const result = await context.isEntityAvailable(
                    entity.type,
                    entity.id,
                    occ.startTime,
                    occ.durationMin,
                );

                if (!result.available) {
                    for (const block of result.conflicts) {
                        conflicts.push({
                            id: `availability-${entity.id}-${occ.eventId}-${occ.occurrenceDate.getTime()}`,
                            type: 'availability-violation',
                            severity: block.hardness === 'hard' ? 'error' : 'warning',
                            message: `${entity.type} ${entity.id} is blocked during event ${occ.eventId}`,
                            involvedEventIds: [occ.eventId],
                            involvedEntityIds: [entity.id],
                            metadata: {
                                entityType: entity.type,
                                hardness: block.hardness,
                                blockStart: block.startTime.toISOString(),
                                blockEnd: block.endTime.toISOString(),
                            },
                        });
                    }
                }
            }
        }

        return conflicts;
    }
}
