import { Injectable } from '@nestjs/common';
import type { DateRange } from '../interfaces/types.js';

@Injectable()
export class TimeService {
    /** Check if two time intervals overlap */
    overlaps(aStart: Date, aDurationMin: number, bStart: Date, bDurationMin: number): boolean {
        const aEnd = this.endTime(aStart, aDurationMin);
        const bEnd = this.endTime(bStart, bDurationMin);
        return aStart < bEnd && bStart < aEnd;
    }

    /** Compute end time from start + duration */
    endTime(start: Date, durationMin: number): Date {
        return new Date(start.getTime() + durationMin * 60_000);
    }

    /** Check if a date falls within a range */
    isInRange(date: Date, range: DateRange): boolean {
        return date >= range.start && date <= range.end;
    }

    /** Compute gap in minutes between two consecutive events */
    gapMinutes(endOfFirst: Date, startOfSecond: Date): number {
        return (startOfSecond.getTime() - endOfFirst.getTime()) / 60_000;
    }

    /** Parse an "HH:MM" time string into total minutes since midnight */
    timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
}
