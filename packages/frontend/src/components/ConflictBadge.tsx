export interface ConflictBadgeProps {
    severity: 'error' | 'warning';
    message: string;
    type?: string;
    className?: string;
}

const defaultStyles: Record<string, React.CSSProperties> = {
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: '1.4',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
    },
    warning: {
        backgroundColor: '#fefce8',
        color: '#ca8a04',
        border: '1px solid #fde68a',
    },
};

export function ConflictBadge({ severity, message, type, className }: ConflictBadgeProps) {
    const badgeStyle: React.CSSProperties = {
        ...defaultStyles.badge,
        ...defaultStyles[severity],
    };

    const icon = severity === 'error' ? '\u26A0' : '\u26A0'; // Warning sign

    return (
        <span
            className={className}
            style={className ? undefined : badgeStyle}
            title={type ? `${type}: ${message}` : message}
            role="status"
        >
            <span aria-hidden="true">{icon}</span>
            <span>{message}</span>
        </span>
    );
}
