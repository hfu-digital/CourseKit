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
    /Lehrperson(?:en)?:\s*(.+?)(?:\n|$)/i,
    /Lehrkraft(?::\s*)?(.+?)(?:\n|$)/i,
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

    // HFU's current StarPlan export commonly places instructor names on the
    // second description line without a label, followed by the semester
    // bucket (for example: `Course title\nMax Mustermann, Erika Muster\nAIN1`).
    // Inspect lines after the title and ignore compact/all-caps bucket names.
    const lines = description
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const nameLine = lines.slice(1).find((line) => {
        if (/^[A-ZÄÖÜ][A-ZÄÖÜ0-9 ._-]{1,20}$/.test(line)) return false;
        return /[A-ZÄÖÜ][a-zäöüß-]+\s+[A-ZÄÖÜ][a-zäöüß-]+/.test(line);
    });
    if (nameLine && nameLine.length >= minLen && nameLine.length <= maxLen && !nameLine.includes('@')) {
        return nameLine;
    }
    return null;
}
