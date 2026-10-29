import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { ValidationResult } from '../interfaces/types.js';

export class DateRangeDto {
    @IsDateString()
    start!: string;

    @IsDateString()
    end!: string;
}

export class QueryFilterDto {
    @ValidateNested()
    @Type(() => DateRangeDto)
    dateRange!: DateRangeDto;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    instructorIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roomIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    groupIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    courseIds?: string[];

    @IsOptional()
    @IsString()
    periodId?: string;

    @IsOptional()
    tags?: Record<string, unknown>;

    static validate(data: unknown): ValidationResult {
        const errors: ValidationResult['errors'] = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: [{ field: 'root', message: 'Data must be an object' }] };
        }

        const d = data as Record<string, unknown>;

        if (!d.dateRange || typeof d.dateRange !== 'object') {
            errors.push({
                field: 'dateRange',
                message: 'dateRange is required and must be an object',
                value: d.dateRange,
            });
        } else {
            const dr = d.dateRange as Record<string, unknown>;
            if (!dr.start) {
                errors.push({
                    field: 'dateRange.start',
                    message: 'dateRange.start is required',
                    value: dr.start,
                });
            }
            if (!dr.end) {
                errors.push({
                    field: 'dateRange.end',
                    message: 'dateRange.end is required',
                    value: dr.end,
                });
            }
            if (dr.start && dr.end) {
                const start = new Date(dr.start as string);
                const end = new Date(dr.end as string);
                if (start >= end) {
                    errors.push({
                        field: 'dateRange',
                        message: 'dateRange.start must be before dateRange.end',
                    });
                }
            }
        }

        const arrayFields = ['instructorIds', 'roomIds', 'groupIds', 'courseIds'] as const;
        for (const field of arrayFields) {
            if (d[field] !== undefined && !Array.isArray(d[field])) {
                errors.push({
                    field,
                    message: `${field} must be an array of strings`,
                    value: d[field],
                });
            }
        }

        return { valid: errors.length === 0, errors };
    }
}
