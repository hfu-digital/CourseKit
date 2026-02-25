import { useState, useEffect, useCallback } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface RoomSearchQuery {
    building?: string;
    campus?: string;
    minCapacity?: number;
    availableAt?: { start: string; end: string };
}

export interface RoomResult {
    id: string;
    name: string;
    building: string | null;
    campus: string | null;
    capacity: number;
    tags: Record<string, unknown> | null;
}

export interface UseRoomSearchResult {
    rooms: RoomResult[];
    loading: boolean;
    error: Error | null;
    search: (query: RoomSearchQuery) => Promise<void>;
}

export function useRoomSearch(initialQuery?: RoomSearchQuery): UseRoomSearchResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const [rooms, setRooms] = useState<RoomResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const search = useCallback(async (query: RoomSearchQuery) => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (query.building) params.set('building', query.building);
            if (query.campus) params.set('campus', query.campus);
            if (query.minCapacity !== undefined) params.set('minCapacity', String(query.minCapacity));
            if (query.availableAt) {
                params.set('availableStart', query.availableAt.start);
                params.set('availableEnd', query.availableAt.end);
            }

            const response = await fetchFn(`${apiUrl}/rooms?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Room search failed: ${response.status}`);
            }

            const data = await response.json();
            setRooms(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [apiUrl, fetchFn]);

    useEffect(() => {
        if (initialQuery) {
            search(initialQuery);
        }
    }, [search, initialQuery]);

    return { rooms, loading, error, search };
}
