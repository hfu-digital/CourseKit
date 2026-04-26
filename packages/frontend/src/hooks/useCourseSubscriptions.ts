import { useCallback, useEffect, useState } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface CourseSubscriptionVariant {
    id: string;
    label: string;
    description: string | null;
}

export interface CourseSubscription {
    courseId: string;
    courseName: string;
    courseCode: string | null;
    semesterId: string;
    isVisible: boolean;
    selectedVariantId: string | null;
    variants: CourseSubscriptionVariant[];
    /** Where this subscription came from: explicit user choice, primary semester, or program default. */
    source: 'manual' | 'primary_semester' | 'default';
}

export interface UseCourseSubscriptionsResult {
    data: CourseSubscription[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;

    setVisibility: (courseId: string, isVisible: boolean) => Promise<void>;
    selectVariant: (courseId: string, variantId: string) => Promise<void>;
    subscribe: (courseId: string) => Promise<void>;
    unsubscribe: (courseId: string) => Promise<void>;
}

interface MutationOpts {
    method: 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
}

/**
 * Manage the authenticated user's course subscriptions: which courses appear
 * in their personal timetable, which split-lecture variant is selected, and
 * whether each is shown or hidden.
 *
 * Endpoints (consumer-implemented, mirroring `/me/timetable/courses` in the
 * HFU api):
 *  - GET    `${apiUrl}/me/courses`                          → CourseSubscription[]
 *  - PATCH  `${apiUrl}/me/courses/:courseId`                → set { isVisible? selectedVariantId? }
 *  - POST   `${apiUrl}/me/courses/:courseId/subscribe`      → enroll in an additional course
 *  - DELETE `${apiUrl}/me/courses/:courseId/subscribe`      → unenroll
 */
export function useCourseSubscriptions(): UseCourseSubscriptionsResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const [data, setData] = useState<CourseSubscription[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchFn(`${apiUrl}/me/courses`);
            if (!response.ok) {
                throw new Error(`Failed to fetch subscriptions: ${response.status}`);
            }
            const result = (await response.json()) as CourseSubscription[];
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [apiUrl, fetchFn]);

    const mutate = useCallback(
        async (path: string, opts: MutationOpts) => {
            const response = await fetchFn(`${apiUrl}${path}`, {
                method: opts.method,
                headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
                body: opts.body ? JSON.stringify(opts.body) : undefined,
            });
            if (!response.ok) {
                throw new Error(`Mutation failed (${opts.method} ${path}): ${response.status}`);
            }
            await fetchData();
        },
        [apiUrl, fetchFn, fetchData],
    );

    const setVisibility = useCallback(
        (courseId: string, isVisible: boolean) =>
            mutate(`/me/courses/${encodeURIComponent(courseId)}`, {
                method: 'PATCH',
                body: { isVisible },
            }),
        [mutate],
    );

    const selectVariant = useCallback(
        (courseId: string, variantId: string) =>
            mutate(`/me/courses/${encodeURIComponent(courseId)}`, {
                method: 'PATCH',
                body: { selectedVariantId: variantId },
            }),
        [mutate],
    );

    const subscribe = useCallback(
        (courseId: string) =>
            mutate(`/me/courses/${encodeURIComponent(courseId)}/subscribe`, { method: 'POST' }),
        [mutate],
    );

    const unsubscribe = useCallback(
        (courseId: string) =>
            mutate(`/me/courses/${encodeURIComponent(courseId)}/subscribe`, { method: 'DELETE' }),
        [mutate],
    );

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
        setVisibility,
        selectVariant,
        subscribe,
        unsubscribe,
    };
}
