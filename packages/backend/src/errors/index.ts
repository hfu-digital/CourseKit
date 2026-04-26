/**
 * CourseKit domain error classes.
 *
 * All errors thrown by CourseKit services and storage adapters extend
 * `CourseKitError` and carry a stable `errorCode` for programmatic handling.
 * Consumers should catch `CourseKitError` and switch on `errorCode` rather
 * than relying on string matching of `error.message`.
 */

export const COURSEKIT_ERROR_CODES = {
    ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
    VERSION_CONFLICT: 'VERSION_CONFLICT',
    CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
    INVALID_RRULE: 'INVALID_RRULE',
    STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

export type CourseKitErrorCode = (typeof COURSEKIT_ERROR_CODES)[keyof typeof COURSEKIT_ERROR_CODES];

export class CourseKitError extends Error {
    public readonly errorCode: CourseKitErrorCode;

    constructor(errorCode: CourseKitErrorCode, message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'CourseKitError';
        this.errorCode = errorCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class EntityNotFoundError extends CourseKitError {
    public readonly entityType: string;
    public readonly entityId: string;

    constructor(entityType: string, entityId: string) {
        super(COURSEKIT_ERROR_CODES.ENTITY_NOT_FOUND, `${entityType} ${entityId} not found`);
        this.name = 'EntityNotFoundError';
        this.entityType = entityType;
        this.entityId = entityId;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class VersionConflictError extends CourseKitError {
    public readonly entityType: string;
    public readonly entityId: string;
    public readonly expectedVersion: number;
    public readonly actualVersion: number;

    constructor(
        entityType: string,
        entityId: string,
        expectedVersion: number,
        actualVersion: number,
    ) {
        super(
            COURSEKIT_ERROR_CODES.VERSION_CONFLICT,
            `Version conflict on ${entityType} ${entityId}: expected ${expectedVersion}, got ${actualVersion}`,
        );
        this.name = 'VersionConflictError';
        this.entityType = entityType;
        this.entityId = entityId;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ConstraintViolationError extends CourseKitError {
    public readonly constraintType: string | undefined;
    public readonly details: string | undefined;

    constructor(message: string, constraintType?: string, details?: string) {
        super(COURSEKIT_ERROR_CODES.CONSTRAINT_VIOLATION, message);
        this.name = 'ConstraintViolationError';
        this.constraintType = constraintType;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidRRuleError extends CourseKitError {
    public readonly rrule: string;

    constructor(rrule: string, reason: string) {
        super(COURSEKIT_ERROR_CODES.INVALID_RRULE, `Invalid RRULE "${rrule}": ${reason}`);
        this.name = 'InvalidRRuleError';
        this.rrule = rrule;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class StorageError extends CourseKitError {
    constructor(message: string, options?: ErrorOptions) {
        super(COURSEKIT_ERROR_CODES.STORAGE_ERROR, message, options);
        this.name = 'StorageError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
