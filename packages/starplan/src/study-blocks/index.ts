/**
 * Study-block (period) configuration.
 *
 * StarPlan-driven institutions use a fixed daily grid of "study blocks" — named
 * time windows that all lectures align to. The defaults below match HFU's grid
 * (six blocks, 08:00–19:00). Other institutions can pass their own
 * `StudyBlockConfig` to functions in this package.
 */

export interface StudyBlock {
    /** 1-based block number, e.g. block 1 = first block of the day. */
    block: number;
    /** Local-time start as `HH:mm`. */
    start: string;
    /** Local-time end as `HH:mm`. */
    end: string;
}

export interface StudyBlockConfig {
    blocks: StudyBlock[];
}

/** HFU's six daily study blocks (default). */
export const HFU_STUDY_BLOCKS: StudyBlock[] = [
    { block: 1, start: '08:00', end: '09:30' },
    { block: 2, start: '09:45', end: '11:15' },
    { block: 3, start: '11:30', end: '13:00' },
    { block: 4, start: '14:00', end: '15:30' },
    { block: 5, start: '15:45', end: '17:15' },
    { block: 6, start: '17:30', end: '19:00' },
];

export const HFU_STUDY_BLOCK_CONFIG: StudyBlockConfig = { blocks: HFU_STUDY_BLOCKS };

const parseHHmm = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map((s) => Number.parseInt(s, 10));
    return h * 60 + m;
};

/**
 * Resolve which study block a local-time `Date` falls into.
 * Returns `null` if it precedes the first block or follows the last block.
 *
 * Block edges are inclusive on `start` and exclusive on `end`. Times in the
 * gap between blocks (e.g. HFU 09:30–09:45) snap forward to the next block.
 */
export function getStudyBlockFromTime(
    date: Date,
    config: StudyBlockConfig = HFU_STUDY_BLOCK_CONFIG,
): number | null {
    const minutes = date.getHours() * 60 + date.getMinutes();
    let last: StudyBlock | null = null;
    for (const block of config.blocks) {
        const start = parseHHmm(block.start);
        const end = parseHHmm(block.end);
        if (minutes >= start && minutes < end) return block.block;
        if (last && minutes >= parseHHmm(last.end) && minutes < start) return block.block;
        last = block;
    }
    if (config.blocks.length > 0) {
        const first = config.blocks[0];
        const tail = config.blocks[config.blocks.length - 1];
        if (minutes < parseHHmm(first.start)) return null;
        if (minutes >= parseHHmm(tail.end)) return null;
    }
    return null;
}

export function getStudyBlockTimeRange(
    block: number,
    config: StudyBlockConfig = HFU_STUDY_BLOCK_CONFIG,
): { start: string; end: string } | null {
    const found = config.blocks.find((b) => b.block === block);
    return found ? { start: found.start, end: found.end } : null;
}
