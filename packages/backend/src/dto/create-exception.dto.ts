import {
    IsDateString,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Min,
} from 'class-validator';
import type { ValidationResult } from '../interfaces/types.js';

export class CreateExceptionDto {
    @IsString()
    @IsNotEmpty()
    eventId!: string;

    @IsDateString()
    originalDate!: string;

    @IsString()
    @IsIn(['cancelled', 'modified', 'added'])
    type!: 'cancelled' | 'modified' | 'added';

    @IsOptional()
    @IsDateString()
    newStartTime?: string | null;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Min(1)
    newDurationMin?: number | null;

    @IsOptional()
    @IsString()
    newRoomId?: string | null;

    @IsOptional()
    metadata?: Record<string, unknown> | null;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }

        const d = data as Record<string, unknown>;

        if (!d.eventId || typeof d.eventId !== 'string') {
            errors.push({ field: 'eventId', message: 'eventId is required', value: d.eventId });
        }

        if (
            !d.originalDate ||
            (typeof d.originalDate !== 'string' && !(d.originalDate instanceof Date))
        ) {
            errors.push({
                field: 'originalDate',
                message: 'originalDate is required',
                value: d.originalDate,
            });
        }

        if (!d.type || !['cancelled', 'modified', 'added'].includes(d.type as string)) {
            errors.push({
                field: 'type',
                message: 'type must be one of: cancelled, modified, added',
                value: d.type,
            });
        }

        return { valid: errors.length === 0, errors };
    }
}
