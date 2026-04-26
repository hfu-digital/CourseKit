/**
 * Minimal HTTP client for StarPlan's JSON + iCal endpoints.
 *
 * Intentionally framework-agnostic — no NestJS injection, no global config.
 * Pass options at construction time. NestJS consumers wrap this in a
 * provider in `@hfu.digital/coursekit-starplan-nestjs`.
 */

import { type FetchWithCharsetOptions, fetchWithCharset } from '../utils/fetch-with-charset.js';

export interface StarPlanProgram {
    id: string;
    name: string;
    shortName?: string;
}

export interface StarPlanSemester {
    id: string;
    programId: string;
    name: string;
    shortName?: string;
}

export interface StarPlanClientOptions {
    /** Base URL of the institution's StarPlan instance. */
    baseUrl: string;
    /** Planning unit identifier (`pu`/`puid` query param). HFU = `5`. */
    planningUnit: string;
    /** Locale code passed as `lan`. Default `de`. */
    locale?: string;
    /** Override `fetch` (auth wrapper, test stub). */
    fetchImpl?: typeof fetch;
    /** Optional logger for diagnostics. Default no-op. */
    logger?: {
        debug?: (msg: string) => void;
        warn?: (msg: string) => void;
        error?: (msg: string) => void;
    };
    /** Charset fallback when `Content-Type` is missing. Default `iso-8859-1`. */
    fallbackCharset?: string;
}

interface StarPlanRawProgram {
    id?: string | number;
    oid?: string | number;
    name?: string;
    shortname?: string;
}

interface StarPlanRawSemester {
    id?: string | number;
    pgid?: string | number;
    name?: string;
    shortname?: string;
}

export class StarPlanClient {
    private readonly baseUrl: string;
    private readonly planningUnit: string;
    private readonly locale: string;
    private readonly fetchOptions: FetchWithCharsetOptions;
    private readonly logger: NonNullable<StarPlanClientOptions['logger']>;

    constructor(options: StarPlanClientOptions) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.planningUnit = options.planningUnit;
        this.locale = options.locale ?? 'de';
        this.fetchOptions = {
            fetchImpl: options.fetchImpl,
            fallbackCharset: options.fallbackCharset,
        };
        this.logger = options.logger ?? {};
    }

    async fetchPrograms(): Promise<StarPlanProgram[]> {
        const url = `${this.baseUrl}/json?m=getogs`;
        this.logger.debug?.(`StarPlan: fetching programs from ${url}`);

        const text = await fetchWithCharset(url, this.fetchOptions);
        const data = JSON.parse(text);

        if (!Array.isArray(data) || !Array.isArray(data[0])) {
            this.logger.warn?.('StarPlan: unexpected programs response shape');
            return [];
        }

        return (data[0] as StarPlanRawProgram[]).map((item) => ({
            id: String(item.id ?? item.oid ?? ''),
            name: String(item.name ?? item.shortname ?? ''),
            shortName: item.shortname ? String(item.shortname) : undefined,
        }));
    }

    async fetchSemesters(programId: string): Promise<StarPlanSemester[]> {
        const url = `${this.baseUrl}/json?m=getPgsExt&pu=${encodeURIComponent(this.planningUnit)}&og=${encodeURIComponent(programId)}`;
        this.logger.debug?.(`StarPlan: fetching semesters for program ${programId}`);

        const text = await fetchWithCharset(url, this.fetchOptions);
        const data = JSON.parse(text);

        if (!Array.isArray(data) || !Array.isArray(data[0])) {
            this.logger.warn?.('StarPlan: unexpected semesters response shape');
            return [];
        }

        return (data[0] as StarPlanRawSemester[]).map((item) => ({
            id: String(item.id ?? item.pgid ?? ''),
            programId,
            name: String(item.name ?? ''),
            shortName: item.shortname ? String(item.shortname) : undefined,
        }));
    }

    async fetchIcal(semesterId: string): Promise<string> {
        const url = this.getIcalUrl(semesterId);
        this.logger.debug?.(`StarPlan: fetching iCal for semester ${semesterId}`);
        return fetchWithCharset(url, this.fetchOptions);
    }

    /** Public, copy-pasteable iCal feed URL for a semester. */
    getIcalUrl(semesterId: string): string {
        return `${this.baseUrl}/ical?lan=${this.locale}&puid=${encodeURIComponent(this.planningUnit)}&type=pg&pgid=${encodeURIComponent(semesterId)}`;
    }
}
