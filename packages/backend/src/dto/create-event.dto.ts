import { IsString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ValidationResult } from '../interfaces/types.js';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsDateString()
    startTime!: string;

    @IsNumber()
    @IsPositive()
    @Min(1)
    durationMin!: number;

    @IsOptional()
    @IsString()
    recurrenceRule?: string | null;

    @IsOptional()
    metadata?: Record<string, unknown> | null;

    @IsOptional()
    @IsString()
    courseId?: string | null;

    @IsOptional()
    @IsString()
    roomId?: string | null;

    @IsOptional()
    @IsString()
    periodId?: string | null;

    /**
     * Static validation without class instantiation.
     * Useful for consumers without class-transformer.
     */
    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }

        const d = data as Record<string, unknown>;

        if (!d.title || typeof d.title !== 'string' || d.title.trim().length === 0) {
            errors.push({ field: 'title', message: 'Title is required and must be a non-empty string', value: d.title });
        }

        if (!d.startTime || (typeof d.startTime !== 'string' && !(d.startTime instanceof Date))) {
            errors.push({ field: 'startTime', message: 'startTime is required and must be a date string', value: d.startTime });
        } else if (typeof d.startTime === 'string' && isNaN(Date.parse(d.startTime))) {
            errors.push({ field: 'startTime', message: 'startTime must be a valid date', value: d.startTime });
        }

        if (d.durationMin === undefined || typeof d.durationMin !== 'number' || d.durationMin < 1) {
            errors.push({ field: 'durationMin', message: 'durationMin is required and must be a positive number', value: d.durationMin });
        }

        if (d.recurrenceRule !== undefined && d.recurrenceRule !== null && typeof d.recurrenceRule !== 'string') {
            errors.push({ field: 'recurrenceRule', message: 'recurrenceRule must be a string or null', value: d.recurrenceRule });
        }

        return { valid: errors.length === 0, errors };
    }
}
