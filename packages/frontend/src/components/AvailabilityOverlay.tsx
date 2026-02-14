export interface AvailabilityBlock {
    startTime: string;
    endTime: string;
    dayIndex: number;
    type: 'available' | 'blocked' | 'preferred';
    hardness: 'hard' | 'soft';
}

export interface AvailabilityOverlayProps {
    blocks: AvailabilityBlock[];
    /** Start hour of the grid (must match TimetableGrid) */
    startHour?: number;
    /** Slot height in pixels per hour (must match TimetableGrid) */
    hourHeight?: number;
    /** Number of days (must match TimetableGrid) */
    dayCount?: number;
    className?: string;
}

const overlayColors: Record<string, { bg: string; border: string }> = {
    'blocked-hard': { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
    'blocked-soft': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.15)' },
    'available-hard': { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' },
    'available-soft': { bg: 'rgba(34, 197, 94, 0.05)', border: 'rgba(34, 197, 94, 0.1)' },
    'preferred-hard': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
    'preferred-soft': { bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.1)' },
};

export function AvailabilityOverlay({
    blocks,
    startHour = 8,
    hourHeight = 60,
    dayCount = 5,
    className,
}: AvailabilityOverlayProps) {
    // Time label column offset
    const timeColumnWidth = 60;

    return (
        <div
            className={className}
            style={className ? undefined : {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
            }}
        >
            {blocks.map((block, idx) => {
                const start = new Date(block.startTime);
                const end = new Date(block.endTime);
                const startTimeHour = start.getHours() + start.getMinutes() / 60;
                const endTimeHour = end.getHours() + end.getMinutes() / 60;

                const top = (startTimeHour - startHour) * hourHeight;
                const height = (endTimeHour - startTimeHour) * hourHeight;

                const dayWidth = `calc((100% - ${timeColumnWidth}px) / ${dayCount})`;
                const left = `calc(${timeColumnWidth}px + ${block.dayIndex} * ${dayWidth})`;

                const colorKey = `${block.type}-${block.hardness}`;
                const colors = overlayColors[colorKey] ?? overlayColors['blocked-soft'];

                return (
                    <div
                        key={idx}
                        style={{
                            position: 'absolute',
                            top: `${top}px`,
                            left,
                            width: dayWidth,
                            height: `${height}px`,
                            backgroundColor: colors.bg,
                            borderLeft: `3px solid ${colors.border}`,
                            borderRadius: '2px',
                        }}
                    />
                );
            })}
        </div>
    );
}
