import {
    IsDateString,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import type {
    AvailabilityEntityType,
    AvailabilityHardness,
    AvailabilityType,
    ValidationResult,
} from '../interfaces/types.js';

export class CreateAvailabilityDto {
    @IsString()
    @IsIn(['instructor', 'room'])
    entityType!: AvailabilityEntityType;

    @IsString()
    @IsNotEmpty()
    entityId!: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(6)
    dayOfWeek?: number | null;

    @IsOptional()
    @IsDateString()
    specificDate?: string | null;

    @IsDateString()
    startTime!: string;

    @IsDateString()
    endTime!: string;

    @IsString()
    @IsIn(['available', 'blocked', 'preferred'])
    type!: AvailabilityType;

    @IsString()
    @IsIn(['hard', 'soft'])
    hardness!: AvailabilityHardness;

    @IsOptional()
    @IsNumber()
    priority?: number;

    @IsOptional()
    @IsString()
    recurrenceRule?: string | null;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }

        const d = data as Record<string, unknown>;

        if (!d.entityType || !['instructor', 'room'].includes(d.entityType as string)) {
            errors.push({
                field: 'entityType',
                message: 'entityType must be instructor or room',
                value: d.entityType,
            });
        }

        if (!d.entityId || typeof d.entityId !== 'string') {
            errors.push({ field: 'entityId', message: 'entityId is required', value: d.entityId });
        }

        if (!d.startTime) {
            errors.push({
                field: 'startTime',
                message: 'startTime is required',
                value: d.startTime,
            });
        }

        if (!d.endTime) {
            errors.push({ field: 'endTime', message: 'endTime is required', value: d.endTime });
        }

        if (!d.type || !['available', 'blocked', 'preferred'].includes(d.type as string)) {
            errors.push({
                field: 'type',
                message: 'type must be available, blocked, or preferred',
                value: d.type,
            });
        }

        if (!d.hardness || !['hard', 'soft'].includes(d.hardness as string)) {
            errors.push({
                field: 'hardness',
                message: 'hardness must be hard or soft',
                value: d.hardness,
            });
        }

        return { valid: errors.length === 0, errors };
    }
}
