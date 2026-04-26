/**
 * Extract a single instructor name from a free-form course `DESCRIPTION`.
 *
 * Defaults match common patterns in German university VEVENT descriptions
 * (`Dozent: …`, `Prof. Dr. …`). Pass `InstructorExtractorConfig.patterns` to
 * support other locales.
 */

export interface InstructorExtractorConfig {
    patterns?: RegExp[];
    minNameLength?: number;
    maxNameLength?: number;
}

const DEFAULT_PATTERNS: RegExp[] = [
    /Dozent(?:in)?:\s*(.+?)(?:\n|$)/i,
    /Instructor:\s*(.+?)(?:\n|$)/i,
    /Lehrer(?:in)?:\s*(.+?)(?:\n|$)/i,
    /Prof\.?\s*(?:Dr\.?\s*)?(.+?)(?:\n|$)/i,
];

export function extractInstructor(
    description: string | undefined,
    config: InstructorExtractorConfig = {},
): string | null {
    if (!description) return null;
    const patterns = config.patterns ?? DEFAULT_PATTERNS;
    const minLen = config.minNameLength ?? 3;
    const maxLen = config.maxNameLength ?? 100;

    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match?.[1]) {
            const name = match[1].trim();
            if (name.length >= minLen && name.length <= maxLen && !name.includes('@')) {
                return name;
            }
        }
    }
    return null;
}
