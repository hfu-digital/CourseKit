import { useState, useCallback } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface ProposedEvent {
    title: string;
    startTime: string;
    durationMin: number;
    recurrenceRule?: string | null;
    courseId?: string | null;
    roomId?: string | null;
    periodId?: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface ConflictInfo {
    id: string;
    type: string;
    severity: 'error' | 'warning';
    message: string;
    involvedEventIds: string[];
    involvedEntityIds: string[];
}

export interface ConflictCheckResult {
    hasErrors: boolean;
    hasWarnings: boolean;
    conflicts: ConflictInfo[];
}

export interface UseConflictCheckResult {
    result: ConflictCheckResult | null;
    loading: boolean;
    error: Error | null;
    check: (event: ProposedEvent, dateRange: { start: string; end: string }) => Promise<ConflictCheckResult | null>;
}

export function useConflictCheck(): UseConflictCheckResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const [result, setResult] = useState<ConflictCheckResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const check = useCallback(async (
        event: ProposedEvent,
        dateRange: { start: string; end: string },
    ): Promise<ConflictCheckResult | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchFn(`${apiUrl}/conflicts/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, dateRange }),
            });

            if (!response.ok) {
                throw new Error(`Conflict check failed: ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
            return data;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [apiUrl, fetchFn]);

    return { result, loading, error, check };
}
