# @hfu.digital/coursekit-react

React hooks and components for academic timetable UI — schedule grids, conflict badges, and availability overlays. Designed to work with `@hfu.digital/coursekit-nestjs` backend.

Part of [CourseKit](https://github.com/hfu-digital/CourseKit) — see the monorepo for the NestJS backend (`@hfu.digital/coursekit-nestjs`).

## Installation

```bash
bun add @hfu.digital/coursekit-react
```

Peer dependencies:

```bash
bun add react react-dom
```

## Quick Start

```tsx
import { CourseKitProvider, useTimetable, TimetableGrid, EventCard } from '@hfu.digital/coursekit-react';

function App() {
    return (
        <CourseKitProvider
            apiUrl="https://api.example.com/coursekit"
            fetch={(url, init) => fetch(url, {
                ...init,
                headers: { ...init?.headers, Authorization: `Bearer ${token}` },
            })}
        >
            <MySchedule />
        </CourseKitProvider>
    );
}

function MySchedule() {
    const { data, loading } = useTimetable({
        dateRange: { start: '2026-03-02', end: '2026-03-08' },
        instructorIds: ['instructor-1'],
    });

    if (loading) return <div>Loading...</div>;

    return (
        <TimetableGrid weekStart="2026-03-02">
            {data.map(occ => (
                <EventCard
                    key={`${occ.eventId}-${occ.occurrenceDate}`}
                    title={occ.originalEvent.title}
                    startTime={occ.startTime}
                    durationMin={occ.durationMin}
                    isException={occ.isException}
                    exceptionType={occ.exceptionType}
                />
            ))}
        </TimetableGrid>
    );
}
```

## Hooks

| Hook | Description |
|------|-------------|
| `useTimetable(query)` | Fetch schedule for entity + date range |
| `useAvailability(query)` | Fetch free/busy for entity |
| `useConflictCheck()` | Real-time conflict preview for proposed event |
| `useMutation(options?)` | Create/update/delete events |
| `useRoomSearch(query?)` | Search rooms by capacity, availability |

## Components

| Component | Description |
|-----------|-------------|
| `TimetableGrid` | Week/day grid view, configurable time axis |
| `EventCard` | Single event display with exception styling |
| `ConflictBadge` | Visual conflict indicator |
| `AvailabilityOverlay` | Free/busy overlay on grid |

## License

MIT
