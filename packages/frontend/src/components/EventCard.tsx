import type { ReactNode } from 'react';

export interface EventCardProps {
    title: string;
    startTime: string;
    durationMin: number;
    room?: string | null;
    instructor?: string | null;
    isException?: boolean;
    exceptionType?: 'cancelled' | 'modified' | 'added' | null;
    className?: string;
    children?: ReactNode;
    onClick?: () => void;
}

const defaultStyles: Record<string, React.CSSProperties> = {
    card: {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        fontSize: '14px',
        lineHeight: '1.4',
    },
    cancelled: {
        opacity: 0.5,
        textDecoration: 'line-through',
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    modified: {
        backgroundColor: '#fefce8',
        borderColor: '#fde68a',
    },
    added: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    title: {
        fontWeight: 600,
        marginBottom: '2px',
    },
    meta: {
        fontSize: '12px',
        color: '#64748b',
    },
};

export function EventCard({
    title,
    startTime,
    durationMin,
    room,
    instructor,
    isException,
    exceptionType,
    className,
    children,
    onClick,
}: EventCardProps) {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMin * 60_000);

    const timeStr = `${formatTime(start)} - ${formatTime(end)}`;

    const cardStyle: React.CSSProperties = {
        ...defaultStyles.card,
        ...(isException && exceptionType ? defaultStyles[exceptionType] : {}),
    };

    return (
        <div
            className={className}
            style={className ? undefined : cardStyle}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick?.();
            }}
        >
            <div style={className ? undefined : defaultStyles.title}>{title}</div>
            <div style={className ? undefined : defaultStyles.meta}>
                <span>{timeStr}</span>
                {room && <span> &middot; {room}</span>}
                {instructor && <span> &middot; {instructor}</span>}
            </div>
            {children}
        </div>
    );
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
