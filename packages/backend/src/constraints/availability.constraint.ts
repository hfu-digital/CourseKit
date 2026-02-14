import { Injectable } from '@nestjs/common';
import { ScheduleConstraint } from '../interfaces/constraint.interface.js';
import type { ConstraintContext } from '../interfaces/constraint.interface.js';
import type { MaterializedOccurrence, Conflict } from '../interfaces/types.js';

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
            // Check if any availability blocks are noted in metadata
            const availabilityBlocks = occ.metadata?.availabilityBlocks as
                Array<{ entityType: string; entityId: string; hardness: string }> | undefined;

            if (availabilityBlocks) {
                for (const block of availabilityBlocks) {
                    conflicts.push({
                        id: `availability-${block.entityId}-${occ.eventId}-${occ.occurrenceDate.getTime()}`,
                        type: 'availability-violation',
                        severity: block.hardness === 'hard' ? 'error' : 'warning',
                        message: `${block.entityType} ${block.entityId} is marked as blocked during event ${occ.eventId}`,
                        involvedEventIds: [occ.eventId],
                        involvedEntityIds: [block.entityId],
                        metadata: {
                            entityType: block.entityType,
                            hardness: block.hardness,
                        },
                    });
                }
            }
        }

        return conflicts;
    }
}
