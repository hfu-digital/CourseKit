import { LatestRequest } from './latest-request.js';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface AvailabilityQuery {
    entityType: 'instructor' | 'room';
    entityId: string;
    dateRange: { start: string; end: string };
}

export interface AvailabilitySlot {
    id: string;
    entityType: 'instructor' | 'room';
    entityId: string;
    startTime: string;
    endTime: string;
    type: 'available' | 'blocked' | 'preferred';
    hardness: 'hard' | 'soft';
}

export interface FreeSlot {
    start: string;
    end: string;
    durationMin: number;
}

export interface UseAvailabilityResult {
    slots: AvailabilitySlot[];
    freeSlots: FreeSlot[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useAvailability(query: AvailabilityQuery | null): UseAvailabilityResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const requests = useRef(new LatestRequest());
    useEffect(() => () => requests.current.cancel(), [apiUrl, fetchFn]);
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!query) { requests.current.cancel(); setLoading(false); return; }

        const signal = requests.current.begin();
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                entityType: query.entityType,
                entityId: query.entityId,
                startDate: query.dateRange.start,
                endDate: query.dateRange.end,
            });

            const response = await fetchFn(`${apiUrl}/availability?${params.toString()}`, { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch availability: ${response.status}`);
            }

            const result = await response.json();
            if (signal.aborted) return;
            setSlots(result.slots ?? []);
            setFreeSlots(result.freeSlots ?? []);
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

    return { slots, freeSlots, loading, error, refetch: fetchData };
}
