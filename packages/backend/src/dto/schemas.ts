/**
 * Zod schemas for CourseKit response DTOs.
 *
 * These schemas are used in tests to assert that transform output matches the
 * declared DTO contract — they catch shape drift between domain types and the
 * HTTP-facing DTOs at test time, not in production. Importing this module in
 * production code is fine but unnecessary; the static types in
 * `../interfaces/response-dto.ts` already enforce shape at compile time.
 *
 * `zod` is a devDependency only.
 */

import { z } from 'zod';

const isoDateTimeSchema = z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'expected ISO 8601 date-time' });

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const dateRangeDtoSchema = z.object({
    start: isoDateTimeSchema,
    end: isoDateTimeSchema,
});

export const occurrenceEventSummaryDtoSchema = z.object({
    id: z.string(),
    title: z.string(),
    courseId: z.string().nullable(),
    periodId: z.string().nullable(),
});

export const occurrenceDtoSchema = z.object({
    eventId: z.string(),
    occurrenceDate: isoDateSchema,
    startTime: isoDateTimeSchema,
    endTime: isoDateTimeSchema,
    durationMin: z.number().int().nonnegative(),
    roomId: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    isException: z.boolean(),
    exceptionType: z.enum(['cancelled', 'modified', 'added']).nullable(),
    event: occurrenceEventSummaryDtoSchema,
});

export const scheduleResponseDtoSchema = z.object({
    dateRange: dateRangeDtoSchema,
    occurrences: z.array(occurrenceDtoSchema),
});

export const conflictDtoSchema = z.object({
    id: z.string(),
    type: z.string(),
    severity: z.enum(['error', 'warning']),
    message: z.string(),
    involvedEventIds: z.array(z.string()),
    involvedEntityIds: z.array(z.string()),
    metadata: z.record(z.string(), z.unknown()),
});

export const conflictCheckResponseDtoSchema = z.object({
    hasErrors: z.boolean(),
    hasWarnings: z.boolean(),
    conflicts: z.array(conflictDtoSchema),
});

export const freeSlotDtoSchema = z.object({
    start: isoDateTimeSchema,
    end: isoDateTimeSchema,
    durationMin: z.number().nonnegative(),
});

export const availabilityDtoSchema = z.object({
    id: z.string(),
    entityType: z.enum(['instructor', 'room']),
    entityId: z.string(),
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    specificDate: isoDateSchema.nullable(),
    startTime: isoDateTimeSchema,
    endTime: isoDateTimeSchema,
    type: z.enum(['available', 'blocked', 'preferred']),
    hardness: z.enum(['hard', 'soft']),
    priority: z.number().int(),
    recurrenceRule: z.string().nullable(),
});
