import { Injectable } from '@nestjs/common';
import { ScheduleConstraint } from '../interfaces/constraint.interface.js';
import type { ConstraintContext } from '../interfaces/constraint.interface.js';
import type { MaterializedOccurrence, Conflict } from '../interfaces/types.js';

@Injectable()
export class OverlapConstraint extends ScheduleConstraint {
    readonly type = 'overlap';
    readonly description = 'Detects time overlaps for instructors and rooms';

    async evaluate(
        occurrences: MaterializedOccurrence[],
        context: ConstraintContext,
    ): Promise<Conflict[]> {
        const conflicts: Conflict[] = [];

        // Build instructor → occurrences map
        const instructorOccurrences = new Map<string, MaterializedOccurrence[]>();
        // Build room → occurrences map
        const roomOccurrences = new Map<string, MaterializedOccurrence[]>();

        for (const occ of occurrences) {
            // Instructor overlaps
            const instructorIds = await context.getInstructorsForEvent(occ.eventId);
            for (const instructorId of instructorIds) {
                if (!instructorOccurrences.has(instructorId)) {
                    instructorOccurrences.set(instructorId, []);
                }
                instructorOccurrences.get(instructorId)!.push(occ);
            }

            // Room overlaps
            if (occ.roomId) {
                if (!roomOccurrences.has(occ.roomId)) {
                    roomOccurrences.set(occ.roomId, []);
                }
                roomOccurrences.get(occ.roomId)!.push(occ);
            }
        }

        // Check instructor overlaps
        for (const [instructorId, occs] of instructorOccurrences) {
            const sorted = [...occs].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            for (let i = 0; i < sorted.length - 1; i++) {
                const a = sorted[i];
                const b = sorted[i + 1];
                const aEnd = new Date(a.startTime.getTime() + a.durationMin * 60_000);

                if (aEnd > b.startTime) {
                    conflicts.push({
                        id: `overlap-instructor-${instructorId}-${a.eventId}-${b.eventId}`,
                        type: 'instructor-double-book',
                        severity: 'error',
                        message: `Instructor ${instructorId} is double-booked between events ${a.eventId} and ${b.eventId}`,
                        involvedEventIds: [a.eventId, b.eventId],
                        involvedEntityIds: [instructorId],
                        metadata: {
                            entityType: 'instructor',
                            aStart: a.startTime.toISOString(),
                            aEnd: aEnd.toISOString(),
                            bStart: b.startTime.toISOString(),
                        },
                    });
                }
            }
        }

        // Check room overlaps
        for (const [roomId, occs] of roomOccurrences) {
            const sorted = [...occs].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            for (let i = 0; i < sorted.length - 1; i++) {
                const a = sorted[i];
                const b = sorted[i + 1];
                const aEnd = new Date(a.startTime.getTime() + a.durationMin * 60_000);

                if (aEnd > b.startTime) {
                    conflicts.push({
                        id: `overlap-room-${roomId}-${a.eventId}-${b.eventId}`,
                        type: 'room-overlap',
                        severity: 'error',
                        message: `Room ${roomId} has overlapping events ${a.eventId} and ${b.eventId}`,
                        involvedEventIds: [a.eventId, b.eventId],
                        involvedEntityIds: [roomId],
                        metadata: {
                            entityType: 'room',
                            aStart: a.startTime.toISOString(),
                            aEnd: aEnd.toISOString(),
                            bStart: b.startTime.toISOString(),
                        },
                    });
                }
            }
        }

        return conflicts;
    }
}
