import { test, expect } from 'bun:test';
import { LatestRequest } from '../src/hooks/latest-request';

test('replacement and cleanup abort transport and late completions cannot win', async () => {
    const requests = new LatestRequest();
    const first = requests.begin();
    let resolve!: (value: string) => void;
    const pending = new Promise<string>(r => { resolve = r; });
    let result = '';
    const completion = pending.then(value => { if (!first.aborted) result = value; });
    const second = requests.begin();
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    result = 'new'; resolve('old'); await completion;
    expect(result).toBe('new');
    requests.cancel();
    expect(second.aborted).toBe(true);
    expect(requests.begin().aborted).toBe(false);
    requests.cancel();
});
