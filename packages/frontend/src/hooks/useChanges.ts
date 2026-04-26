import { useCallback, useEffect, useState } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export type ChangeAction = 'created' | 'updated' | 'deleted';

export type ChangeEntityType = 'event' | 'course' | 'room' | 'instructor' | 'program' | 'semester';

export interface ChangeRecord {
    id: string;
    entityType: ChangeEntityType;
    entityId: string;
    action: ChangeAction;
    changedFields: string[];
    previousData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
    createdAt: string;
}

export interface ChangesQuery {
    /** ISO 8601 date-time. Only changes occurring on or after this moment are returned. */
    since?: string;
    /** Filter to one entity type. */
    entityType?: ChangeEntityType;
    /** Filter to a specific action. */
    action?: ChangeAction;
    /** Pagination cursor or page (consumer-defined). */
    cursor?: string;
    /** Optional scope, e.g. `'me'` for the authenticated user. Consumer-side semantics. */
    scope?: string;
    /** Page size. */
    limit?: number;
}

export interface UseChangesResult {
    data: ChangeRecord[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Fetch a paginated list of timetable change records.
 *
 * The endpoint is `${apiUrl}/changes`. Consumer servers should accept the
 * query parameters mapped 1:1 from `ChangesQuery`.
 */
export function useChanges(query: ChangesQuery | null): UseChangesResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const [data, setData] = useState<ChangeRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!query) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (query.since) params.set('since', query.since);
            if (query.entityType) params.set('entityType', query.entityType);
            if (query.action) params.set('action', query.action);
            if (query.cursor) params.set('cursor', query.cursor);
            if (query.scope) params.set('scope', query.scope);
            if (query.limit !== undefined) params.set('limit', String(query.limit));

            const response = await fetchFn(`${apiUrl}/changes?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch changes: ${response.status}`);
            }
            const result = (await response.json()) as ChangeRecord[] | { data: ChangeRecord[] };
            setData(Array.isArray(result) ? result : result.data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [apiUrl, fetchFn, query ? JSON.stringify(query) : null]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
