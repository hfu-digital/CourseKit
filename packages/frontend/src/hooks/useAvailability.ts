import { useState, useEffect, useCallback } from 'react';
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

    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!query) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                entityType: query.entityType,
                entityId: query.entityId,
                startDate: query.dateRange.start,
                endDate: query.dateRange.end,
            });

            const response = await fetchFn(`${apiUrl}/availability?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch availability: ${response.status}`);
            }

            const result = await response.json();
            setSlots(result.slots ?? []);
            setFreeSlots(result.freeSlots ?? []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [apiUrl, fetchFn, query ? JSON.stringify(query) : null]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { slots, freeSlots, loading, error, refetch: fetchData };
}
