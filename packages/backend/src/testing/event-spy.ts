import type { DomainEventMap } from '../interfaces/domain-events.interface.js';
import { DOMAIN_EVENTS } from '../interfaces/domain-events.interface.js';

interface CapturedEvent {
    name: string;
    payload: unknown;
    timestamp: Date;
}

/**
 * Captures emitted domain events for test assertions.
 * Works as a mock EventEmitter2 subscriber.
 */
export class EventSpy {
    private captured: CapturedEvent[] = [];

    /**
     * Create a mock EventEmitter2 that records all emissions.
     * Use this as a replacement for the real emitter in tests.
     */
    createMockEmitter(): { emit: (event: string, payload: unknown) => boolean } {
        return {
            emit: (event: string, payload: unknown): boolean => {
                this.captured.push({
                    name: event,
                    payload,
                    timestamp: new Date(),
                });
                return true;
            },
        };
    }

    /** Get all captured events */
    getAll(): CapturedEvent[] {
        return [...this.captured];
    }

    /** Get events by name */
    getByName(name: string): CapturedEvent[] {
        return this.captured.filter(e => e.name === name);
    }

    /** Check if an event was emitted */
    wasEmitted(name: string): boolean {
        return this.captured.some(e => e.name === name);
    }

    /** Get the count of events with a given name */
    countByName(name: string): number {
        return this.captured.filter(e => e.name === name).length;
    }

    /** Get the last emitted event */
    getLast(): CapturedEvent | undefined {
        return this.captured[this.captured.length - 1];
    }

    /** Get the last emitted event with a given name */
    getLastByName(name: string): CapturedEvent | undefined {
        const events = this.getByName(name);
        return events[events.length - 1];
    }

    /** Clear all captured events */
    clear(): void {
        this.captured = [];
    }
}
