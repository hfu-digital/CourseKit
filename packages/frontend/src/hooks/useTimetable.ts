import { LatestRequest } from './latest-request.js';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface TimetableQuery {
    dateRange: { start: string; end: string };
    instructorIds?: string[];
    roomIds?: string[];
    groupIds?: string[];
    courseIds?: string[];
    periodId?: string;
}

/**
 * Mirror of `OccurrenceDto` from `@hfu.digital/coursekit-nestjs`.
 * Kept in sync manually so the React package stays free of a runtime dep on
 * the backend package.
 */
export interface TimetableOccurrence {
    eventId: string;
    occurrenceDate: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    roomId: string | null;
    metadata: Record<string, unknown> | null;
    isException: boolean;
    exceptionType: 'cancelled' | 'modified' | 'added' | null;
    event: {
        id: string;
        title: string;
        courseId: string | null;
        periodId: string | null;
    };
}

export interface UseTimetableResult {
    data: TimetableOccurrence[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useTimetable(query: TimetableQuery | null): UseTimetableResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const requests = useRef(new LatestRequest());
    useEffect(() => () => requests.current.cancel(), [apiUrl, fetchFn]);
    const [data, setData] = useState<TimetableOccurrence[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!query) { requests.current.cancel(); setLoading(false); return; }

        const signal = requests.current.begin();
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('startDate', query.dateRange.start);
            params.set('endDate', query.dateRange.end);
            if (query.instructorIds?.length)
                params.set('instructorIds', query.instructorIds.join(','));
            if (query.roomIds?.length) params.set('roomIds', query.roomIds.join(','));
            if (query.groupIds?.length) params.set('groupIds', query.groupIds.join(','));
            if (query.courseIds?.length) params.set('courseIds', query.courseIds.join(','));
            if (query.periodId) params.set('periodId', query.periodId);

            const response = await fetchFn(`${apiUrl}/schedule?${params.toString()}`, { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch timetable: ${response.status}`);
            }

            const result = await response.json();
            if (signal.aborted) return;
            setData(result);
        } catch (err) {
            if (signal.aborted) return;
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [apiUrl, fetchFn, query ? JSON.stringify(query) : null]);

    useEffect(() => {
        fetchData();
        return () => requests.current.cancel();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
