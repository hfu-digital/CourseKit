import { useCallback, useEffect, useState } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface Semester {
    id: string;
    programId: string;
    name: string;
    shortName: string | null;
    isActive: boolean;
    isArchived: boolean;
}

export interface UseSemesterResult {
    /** The user's current semester, or null if not set / not yet loaded. */
    current: Semester | null;
    /** All semesters available to the user (e.g. for picking electives across semesters). */
    available: Semester[];
    loading: boolean;
    error: Error | null;
    /** Set the user's current semester; consumer endpoint should persist server-side. */
    setCurrent: (semesterId: string) => Promise<void>;
    refetch: () => Promise<void>;
}

/**
 * Manage the authenticated user's active semester.
 *
 * Endpoints:
 *  - GET `${apiUrl}/me/semester` → `{ current: Semester | null; available: Semester[] }`
 *  - PATCH `${apiUrl}/me/semester` → `{ semesterId }` to update.
 *
 * The hook is intended for the website's `/me/courses` semester picker.
 * Open-source consumers without a "me" concept should mount different routes
 * and use `useTimetable` directly with `periodId`.
 */
export function useSemester(): UseSemesterResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const [current, setCurrentState] = useState<Semester | null>(null);
    const [available, setAvailable] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchFn(`${apiUrl}/me/semester`);
            if (!response.ok) {
                throw new Error(`Failed to fetch semester: ${response.status}`);
            }
            const result = (await response.json()) as {
                current: Semester | null;
                available: Semester[];
            };
            setCurrentState(result.current);
            setAvailable(result.available);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [apiUrl, fetchFn]);

    const setCurrent = useCallback(
        async (semesterId: string) => {
            const response = await fetchFn(`${apiUrl}/me/semester`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ semesterId }),
            });
            if (!response.ok) {
                throw new Error(`Failed to update semester: ${response.status}`);
            }
            await fetchData();
        },
        [apiUrl, fetchFn, fetchData],
    );

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { current, available, loading, error, setCurrent, refetch: fetchData };
}
