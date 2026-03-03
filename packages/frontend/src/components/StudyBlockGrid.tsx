import { type ReactNode } from 'react';
import { STUDY_BLOCKS, getStudyBlockFromTime, getEventHeight } from '../utils/hfu-blocks.js';

export interface StudyBlockEvent {
    id: string;
    title: string;
    /** HH:MM */
    startTime: string;
    /** HH:MM */
    endTime: string;
    /** 0-based index into the days array */
    dayIndex: number;
}

export interface StudyBlockGridProps {
    /** Column headers (default: Mon–Fri) */
    days?: string[];
    /** Events to render */
    events?: StudyBlockEvent[];
    /**
     * Custom event renderer.
     * Receives the event and the computed CSS height string (e.g. "75%").
     */
    renderEvent?: (event: StudyBlockEvent, height: string) => ReactNode;
    /** Row height in pixels for each block cell (default: 80) */
    blockHeight?: number;
    className?: string;
}

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'grid',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        fontSize: '14px',
    },
    headerCell: {
        padding: '8px 12px',
        textAlign: 'center' as const,
        fontWeight: 600,
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
    },
    blockLabel: {
        padding: '4px 8px',
        fontSize: '12px',
        color: '#64748b',
        borderRight: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px',
    },
    blockNumber: {
        fontWeight: 600,
        color: '#475569',
    },
    dayCell: {
        position: 'relative' as const,
        borderRight: '1px solid #f1f5f9',
        borderBottom: '1px solid #e2e8f0',
    },
    eventBlock: {
        position: 'absolute' as const,
        top: 0,
        left: '2px',
        right: '2px',
        padding: '4px 6px',
        borderRadius: '4px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        fontSize: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
    },
};

/**
 * A block-based timetable grid that renders the 6 HFU study blocks as rows.
 *
 * Unlike `TimetableGrid` (which uses a continuous hour axis), each row
 * corresponds to one named study block and events are sized proportionally
 * within their block cell using `getEventHeight`.
 */
export function StudyBlockGrid({
    days = DEFAULT_DAYS,
    events = [],
    renderEvent,
    blockHeight = 80,
    className,
}: StudyBlockGridProps) {
    const gridTemplateColumns = `80px repeat(${days.length}, 1fr)`;

    return (
        <div
            className={className}
            style={
                className
                    ? undefined
                    : { ...styles.container, display: 'grid', gridTemplateColumns }
            }
        >
            {/* Header row */}
            <div style={styles.headerCell} />
            {days.map((day) => (
                <div key={day} style={styles.headerCell}>
                    {day}
                </div>
            ))}

            {/* One row per HFU study block */}
            {STUDY_BLOCKS.map(({ block, start, end }) => (
                <div key={block} style={{ display: 'contents' }}>
                    {/* Block label */}
                    <div style={{ ...styles.blockLabel, height: blockHeight }}>
                        <span style={styles.blockNumber}>Block {block}</span>
                        <span>
                            {start}–{end}
                        </span>
                    </div>

                    {/* Day cells */}
                    {days.map((day, dayIdx) => {
                        const blockEvents = events.filter(
                            (e) => e.dayIndex === dayIdx && getStudyBlockFromTime(e.startTime) === block,
                        );

                        return (
                            <div key={`${day}-${block}`} style={{ ...styles.dayCell, height: blockHeight }}>
                                {blockEvents.map((event) => {
                                    const height = getEventHeight(event.endTime, start, end);

                                    if (renderEvent) {
                                        return (
                                            <div
                                                key={event.id}
                                                style={{ ...styles.eventBlock, height }}
                                            >
                                                {renderEvent(event, height)}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={event.id} style={{ ...styles.eventBlock, height }}>
                                            {event.title}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
