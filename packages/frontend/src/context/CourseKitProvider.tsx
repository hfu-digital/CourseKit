import { createContext, type ReactNode, useContext } from 'react';

export interface CourseKitConfig {
    apiUrl: string;
    /** Optional: custom fetch function for auth headers, etc. */
    fetch?: typeof globalThis.fetch;
}

const CourseKitContext = createContext<CourseKitConfig | null>(null);

export const useCourseKitConfig = () => {
    const ctx = useContext(CourseKitContext);
    if (!ctx) throw new Error('Wrap your app in <CourseKitProvider>');
    return ctx;
};

export const CourseKitProvider = ({
    apiUrl,
    fetch,
    children,
}: CourseKitConfig & { children: ReactNode }) => (
    <CourseKitContext.Provider value={{ apiUrl, fetch }}>{children}</CourseKitContext.Provider>
);
