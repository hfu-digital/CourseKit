import { test, expect } from 'bun:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { LatestRequest } from '../src/hooks/latest-request';

// Execute the real hook body with a deterministic effect/state dispatcher.
// No DOM or cross-test React module replacement is needed.
function harness(name: string, fetcher: typeof fetch) {
    const source = readFileSync(new URL(`../src/hooks/${name}.ts`, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/export /g, '');
    const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
    const cells: { value?: unknown; deps?: unknown[]; cleanup?: () => void }[] = [];
    let cursor = 0;
    let effects: (() => void)[] = [];
    const changed = (a?: unknown[], b?: unknown[]) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
    const useState = (initial: unknown) => {
        const cell = cells[cursor] ??= { value: initial }; cursor++;
        return [cell.value, (value: unknown) => { cell.value = value; }];
    };
    const useRef = (initial: unknown) => {
        const cell = cells[cursor] ??= { value: { current: initial } }; cursor++; return cell.value;
    };
    const useCallback = (fn: unknown, deps: unknown[]) => {
        const cell = cells[cursor] ??= {}; cursor++;
        if (changed(cell.deps, deps)) { cell.value = fn; cell.deps = deps; } return cell.value;
    };
    const useEffect = (fn: () => (() => void) | undefined, deps: unknown[]) => {
        const cell = cells[cursor] ??= {}; cursor++;
        if (changed(cell.deps, deps)) { cell.deps = deps; effects.push(() => { cell.cleanup?.(); cell.cleanup = fn(); }); }
    };
    const hook = new Function('useState', 'useRef', 'useCallback', 'useEffect', 'useCourseKitConfig', 'LatestRequest', `${javascript}; return ${name};`)(useState, useRef, useCallback, useEffect, () => ({ apiUrl: '/api', fetch: fetcher }), LatestRequest);
    return {
        render(query: unknown) { cursor = 0; effects = []; const result = hook(query); effects.forEach(fn => fn()); return result; },
        unmount() { cells.forEach(cell => cell.cleanup?.()); },
    };
}
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
for (const name of ['useTimetable', 'useChanges', 'useAvailability']) {
    test(`${name} aborts replacement/disabled/unmount and ignores late custom-fetch results`, async () => {
        const pending: { signal: AbortSignal; resolve: (response: Response) => void }[] = [];
        const fetcher = ((_url: unknown, init?: RequestInit) => new Promise<Response>(resolve => pending.push({ signal: init!.signal!, resolve }))) as typeof fetch;
        const h = harness(name, fetcher);
        const query = { dateRange: { start: '2026-01-01', end: '2026-01-02' }, entityType: 'room', entityId: 'r', since: '2026-01-01' };
        h.render(query);
        const next = { ...query, entityId: 's', since: '2026-01-02', dateRange: { ...query.dateRange, end: '2026-01-03' } };
        h.render(next);
        expect(pending[0]!.signal.aborted).toBe(true);
        const newData = name === 'useAvailability' ? { slots: [{ id: 'new' }], freeSlots: [] } : [{ id: 'new' }];
        pending[1]!.resolve(Response.json(newData)); await settle();
        pending[0]!.resolve(Response.json(name === 'useAvailability' ? { slots: [{ id: 'old' }] } : [{ id: 'old' }])); await settle();
        const result = h.render(next);
        expect((result.data ?? result.slots)[0].id).toBe('new'); expect(result.loading).toBe(false);
        const refresh = result.refetch(); h.render(null);
        expect(pending[2]!.signal.aborted).toBe(true);
        pending[2]!.resolve(Response.json([])); await refresh;
        h.render(query); h.unmount(); expect(pending[3]!.signal.aborted).toBe(true);
        pending[3]!.resolve(Response.json([])); await settle();
    });
}
