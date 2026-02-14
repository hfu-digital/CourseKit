import { useMemo, type ReactNode } from 'react';

export interface TimetableGridEvent {
    id: string;
    title: string;
    startTime: string;
    durationMin: number;
    dayIndex: number; // 0-based index into days array
}

export interface TimetableGridProps {
    /** Start hour of the grid (default: 8) */
    startHour?: number;
    /** End hour of the grid (default: 20) */
    endHour?: number;
    /** Days to display (default: Mon-Fri) */
    days?: string[];
    /** The date of the first day (Monday) */
    weekStart: string;
    /** Events to render */
    events?: TimetableGridEvent[];
    /** Custom renderer for events */
    renderEvent?: (event: TimetableGridEvent) => ReactNode;
    /** Slot height in pixels per hour (default: 60) */
    hourHeight?: number;
    className?: string;
}

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const gridStyles: Record<string, React.CSSProperties> = {
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
    timeLabel: {
        padding: '4px 8px',
        textAlign: 'right' as const,
        fontSize: '12px',
        color: '#64748b',
        borderRight: '1px solid #e2e8f0',
    },
    dayColumn: {
        position: 'relative' as const,
        borderRight: '1px solid #f1f5f9',
    },
    hourLine: {
        borderBottom: '1px solid #f1f5f9',
    },
    eventBlock: {
        position: 'absolute' as const,
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

export function TimetableGrid({
    startHour = 8,
    endHour = 20,
    days = DEFAULT_DAYS,
    weekStart,
    events = [],
    renderEvent,
    hourHeight = 60,
    className,
}: TimetableGridProps) {
    const totalHours = endHour - startHour;
    const hours = useMemo(
        () => Array.from({ length: totalHours }, (_, i) => startHour + i),
        [startHour, totalHours],
    );

    const gridTemplateColumns = `60px repeat(${days.length}, 1fr)`;

    return (
        <div
            className={className}
            style={className ? undefined : {
                ...gridStyles.container,
                gridTemplateColumns,
            }}
        >
            {/* Header row */}
            <div style={gridStyles.headerCell} />
            {days.map((day) => (
                <div key={day} style={gridStyles.headerCell}>{day}</div>
            ))}

            {/* Time rows */}
            {hours.map((hour) => (
                <div key={`row-${hour}`} style={{ display: 'contents' }}>
                    <div style={{ ...gridStyles.timeLabel, height: hourHeight }}>
                        {`${hour.toString().padStart(2, '0')}:00`}
                    </div>
                    {days.map((day, dayIdx) => (
                        <div
                            key={`${day}-${hour}`}
                            style={{
                                ...gridStyles.dayColumn,
                                ...gridStyles.hourLine,
                                height: hourHeight,
                            }}
                        >
                            {/* Render events that start in this day */}
                            {hour === startHour && events
                                .filter(e => e.dayIndex === dayIdx)
                                .map(event => {
                                    const eventDate = new Date(event.startTime);
                                    const eventHour = eventDate.getHours() + eventDate.getMinutes() / 60;
                                    const top = (eventHour - startHour) * hourHeight;
                                    const height = (event.durationMin / 60) * hourHeight;

                                    if (renderEvent) {
                                        return (
                                            <div
                                                key={event.id}
                                                style={{
                                                    position: 'absolute',
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                    left: '2px',
                                                    right: '2px',
                                                }}
                                            >
                                                {renderEvent(event)}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={event.id}
                                            style={{
                                                ...gridStyles.eventBlock,
                                                top: `${top}px`,
                                                height: `${height}px`,
                                            }}
                                        >
                                            {event.title}
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
