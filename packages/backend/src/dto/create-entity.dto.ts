import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, Min } from 'class-validator';
import type { ValidationResult } from '../interfaces/types.js';

export class CreateRoomDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    building?: string | null;

    @IsOptional()
    @IsString()
    campus?: string | null;

    @IsNumber()
    @Min(0)
    capacity!: number;

    @IsOptional()
    tags?: Record<string, unknown> | null;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }
        const d = data as Record<string, unknown>;
        if (!d.name || typeof d.name !== 'string') {
            errors.push({ field: 'name', message: 'name is required', value: d.name });
        }
        if (d.capacity === undefined || typeof d.capacity !== 'number' || d.capacity < 0) {
            errors.push({ field: 'capacity', message: 'capacity must be a non-negative number', value: d.capacity });
        }
        return { valid: errors.length === 0, errors };
    }
}

export class CreateInstructorDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    email?: string | null;

    @IsOptional()
    tags?: Record<string, unknown> | null;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }
        const d = data as Record<string, unknown>;
        if (!d.name || typeof d.name !== 'string') {
            errors.push({ field: 'name', message: 'name is required', value: d.name });
        }
        return { valid: errors.length === 0, errors };
    }
}

export class CreateGroupDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsIn(['fixed', 'enrollment'])
    type!: 'fixed' | 'enrollment';

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxCapacity?: number | null;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }
        const d = data as Record<string, unknown>;
        if (!d.name || typeof d.name !== 'string') {
            errors.push({ field: 'name', message: 'name is required', value: d.name });
        }
        if (!d.type || !['fixed', 'enrollment'].includes(d.type as string)) {
            errors.push({ field: 'type', message: 'type must be fixed or enrollment', value: d.type });
        }
        return { valid: errors.length === 0, errors };
    }
}

export class CreateCourseDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    code?: string | null;

    @IsOptional()
    @IsString()
    parentId?: string | null;

    @IsOptional()
    metadata?: Record<string, unknown> | null;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }
        const d = data as Record<string, unknown>;
        if (!d.name || typeof d.name !== 'string') {
            errors.push({ field: 'name', message: 'name is required', value: d.name });
        }
        return { valid: errors.length === 0, errors };
    }
}
