/**
 * Extract structured room metadata from a free-form `LOCATION` string.
 *
 * The defaults match HFU's room codes (`A1.0.1`, `B2.1.05`, etc.). Pass a
 * `RoomExtractorConfig` to customize the regex or online-keyword list.
 */

export interface ExtractedRoom {
    name: string;
    building: string | null;
    floor: string | null;
    isOnline: boolean;
}

export interface RoomExtractorConfig {
    /**
     * Regex that captures `building` (group 1) and `floor` (group 2) from a
     * room string. Default is HFU's `A1.0.1` pattern.
     */
    pattern?: RegExp;
    /** Lowercased substrings that flag a room as online/virtual. */
    onlineKeywords?: string[];
}

const DEFAULT_PATTERN = /^([A-Za-z]+\d*)\.(\d+)\.\d+/;
const DEFAULT_ONLINE_KEYWORDS = ['online', 'zoom', 'teams', 'virtuell', 'virtual', 'webex'];

export function extractRoom(
    location: string | undefined,
    config: RoomExtractorConfig = {},
): ExtractedRoom | null {
    if (!location || location.trim() === '') return null;
    const name = location.trim();

    const onlineKeywords = config.onlineKeywords ?? DEFAULT_ONLINE_KEYWORDS;
    const isOnline = onlineKeywords.some((kw) => name.toLowerCase().includes(kw));
    if (isOnline) return { name, building: null, floor: null, isOnline: true };

    const pattern = config.pattern ?? DEFAULT_PATTERN;
    const match = name.match(pattern);
    if (match) {
        return {
            name,
            building: match[1].toUpperCase(),
            floor: match[2],
            isOnline: false,
        };
    }

    return { name, building: null, floor: null, isOnline: false };
}
