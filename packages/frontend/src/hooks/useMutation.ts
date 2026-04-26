import { useCallback, useState } from 'react';
import { useCourseKitConfig } from '../context/CourseKitProvider.js';

export interface MutationOptions {
    onSuccess?: (data: unknown) => void;
    onError?: (error: Error) => void;
}

export interface UseMutationResult {
    loading: boolean;
    error: Error | null;
    createEvent: (data: Record<string, unknown>) => Promise<unknown>;
    updateEvent: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    deleteEvent: (id: string) => Promise<void>;
    createException: (data: Record<string, unknown>) => Promise<unknown>;
    deleteException: (id: string) => Promise<void>;
}

export function useMutation(options?: MutationOptions): UseMutationResult {
    const { apiUrl, fetch: customFetch } = useCourseKitConfig();
    const fetchFn = customFetch ?? globalThis.fetch;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const request = useCallback(
        async (method: string, path: string, body?: unknown): Promise<unknown> => {
            setLoading(true);
            setError(null);

            try {
                const init: RequestInit = {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                };

                if (body !== undefined) {
                    init.body = JSON.stringify(body);
                }

                const response = await fetchFn(`${apiUrl}${path}`, init);

                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }

                // DELETE responses may not have a body
                if (response.status === 204 || method === 'DELETE') {
                    options?.onSuccess?.(null);
                    return null;
                }

                const data = await response.json();
                options?.onSuccess?.(data);
                return data;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                options?.onError?.(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [apiUrl, fetchFn, options?.onSuccess, options?.onError],
    );

    const createEvent = useCallback(
        (data: Record<string, unknown>) => request('POST', '/events', data),
        [request],
    );

    const updateEvent = useCallback(
        (id: string, data: Record<string, unknown>) => request('PATCH', `/events/${id}`, data),
        [request],
    );

    const deleteEvent = useCallback(
        async (id: string) => {
            await request('DELETE', `/events/${id}`);
        },
        [request],
    );

    const createException = useCallback(
        (data: Record<string, unknown>) => request('POST', '/exceptions', data),
        [request],
    );

    const deleteException = useCallback(
        async (id: string) => {
            await request('DELETE', `/exceptions/${id}`);
        },
        [request],
    );

    return {
        loading,
        error,
        createEvent,
        updateEvent,
        deleteEvent,
        createException,
        deleteException,
    };
}
