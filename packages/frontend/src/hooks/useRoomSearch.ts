import { LatestRequest } from './latest-request.js';
import { useCallback, useEffect, useState, useRef } from 'react';
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

    const requests = useRef(new LatestRequest());
    useEffect(() => () => requests.current.cancel(), [apiUrl, fetchFn]);
    const [rooms, setRooms] = useState<RoomResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const search = useCallback(
        async (query: RoomSearchQuery) => {
            const signal = requests.current.begin();
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams();
                if (query.building) params.set('building', query.building);
                if (query.campus) params.set('campus', query.campus);
                if (query.minCapacity !== undefined)
                    params.set('minCapacity', String(query.minCapacity));
                if (query.availableAt) {
                    params.set('availableStart', query.availableAt.start);
                    params.set('availableEnd', query.availableAt.end);
                }

                const response = await fetchFn(`${apiUrl}/rooms?${params.toString()}`, { signal });
                if (!response.ok) {
                    throw new Error(`Room search failed: ${response.status}`);
                }

                const data = await response.json();
                if (signal.aborted) return;
                setRooms(data);
            } catch (err) {
                if (signal.aborted) return;
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        },
        [apiUrl, fetchFn],
    );

    useEffect(() => {
        if (initialQuery) {
            search(initialQuery);
        }
        return () => requests.current.cancel();
    }, [search, initialQuery ? JSON.stringify(initialQuery) : null]);

    return { rooms, loading, error, search };
}
