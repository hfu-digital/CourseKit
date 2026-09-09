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

/** Stable representation of a lecture returned by StarPlan's semester endpoint. */
export interface StarPlanLecture {
    id?: string;
    name?: string;
    /** StarPlan calls this field `shortname` in its current JSON response. */
    code?: string;
}

export interface StarPlanSemester {
    id: string;
    programId: string;
    name: string;
    shortName?: string;
    /** Source lectures, when the StarPlan instance includes them in the response. */
    lectures?: StarPlanLecture[];
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

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

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
    lectures?: StarPlanRawLecture[];
}

interface StarPlanRawLecture {
    id?: string | number;
    name?: string;
    code?: string | number;
    shortname?: string | number;
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

        const text = await this.fetchValidated(url, 'program list', (body) => {
            const data = parseJson(body, 'program list', url);
            if (!Array.isArray(data) || !Array.isArray(data[0])) {
                throw new Error(`StarPlan program list response had an unexpected shape (${url})`);
            }
        });
        const data = parseJson(text, 'program list', url) as unknown[][];

        return (data[0] as StarPlanRawProgram[]).map((item) => ({
            id: String(item.id ?? item.oid ?? ''),
            name: String(item.name ?? item.shortname ?? ''),
            shortName: item.shortname ? String(item.shortname) : undefined,
        }));
    }

    async fetchSemesters(programId: string): Promise<StarPlanSemester[]> {
        const url = `${this.baseUrl}/json?m=getPgsExt&pu=${encodeURIComponent(this.planningUnit)}&og=${encodeURIComponent(programId)}`;
        this.logger.debug?.(`StarPlan: fetching semesters for program ${programId}`);

        const text = await this.fetchValidated(url, `semester list for ${programId}`, (body) => {
            const data = parseJson(body, `semester list for ${programId}`, url);
            if (!Array.isArray(data) || !Array.isArray(data[0])) {
                throw new Error(
                    `StarPlan semester list response had an unexpected shape (${url})`,
                );
            }
        });
        const data = parseJson(text, `semester list for ${programId}`, url) as unknown[][];

        return (data[0] as StarPlanRawSemester[]).map((item) => {
            const lectures = Array.isArray(item.lectures)
                ? item.lectures.map((lecture) => ({
                      ...(lecture.id != null ? { id: String(lecture.id) } : {}),
                      ...(lecture.name != null ? { name: String(lecture.name) } : {}),
                      ...(lecture.code != null || lecture.shortname != null
                          ? { code: String(lecture.code ?? lecture.shortname) }
                          : {}),
                  }))
                : undefined;

            return {
                id: String(item.id ?? item.pgid ?? ''),
                programId,
                name: String(item.name ?? ''),
                shortName: item.shortname ? String(item.shortname) : undefined,
                ...(lectures !== undefined ? { lectures } : {}),
            };
        });
    }

    async fetchIcal(semesterId: string): Promise<string> {
        const url = this.getIcalUrl(semesterId);
        this.logger.debug?.(`StarPlan: fetching iCal for semester ${semesterId}`);
        return this.fetchValidated(url, `iCal for semester ${semesterId}`, (body) => {
            const normalized = body.replace(/^\uFEFF/, '').trimStart();
            if (!normalized.startsWith('BEGIN:VCALENDAR')) {
                throw new Error(
                    `StarPlan iCal response was not a calendar (${url}); received ${preview(body)}`,
                );
            }
            if (!normalized.includes('END:VCALENDAR')) {
                throw new Error(`StarPlan iCal response was incomplete (${url})`);
            }
        });
    }

    /** Public, copy-pasteable iCal feed URL for a semester. */
    getIcalUrl(semesterId: string): string {
        return `${this.baseUrl}/ical?lan=${this.locale}&puid=${encodeURIComponent(this.planningUnit)}&type=pg&pgid=${encodeURIComponent(semesterId)}`;
    }

    private async fetchValidated(
        url: string,
        description: string,
        validate: (body: string) => void,
    ): Promise<string> {
        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
            try {
                const body = await fetchWithCharset(url, this.fetchOptions);
                validate(body);
                return body;
            } catch (error) {
                lastError = error;
                if (attempt === MAX_FETCH_ATTEMPTS) break;
                this.logger.warn?.(
                    `StarPlan: ${description} failed (attempt ${attempt}/${MAX_FETCH_ATTEMPTS}); retrying`,
                );
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            }
        }

        throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }
}

function parseJson(body: string, description: string, url: string): unknown {
    try {
        return JSON.parse(body);
    } catch {
        throw new Error(
            `StarPlan ${description} response was not valid JSON (${url}); received ${preview(body)}`,
        );
    }
}

function preview(body: string): string {
    const value = body.trim().replace(/\s+/g, ' ').slice(0, 120);
    return value ? `body starting with ${JSON.stringify(value)}` : 'an empty body';
}
