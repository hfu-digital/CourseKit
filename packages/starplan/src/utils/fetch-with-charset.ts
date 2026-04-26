/**
 * Fetch a URL and decode the response body using the charset declared in the
 * `Content-Type` header. Falls back to ISO-8859-1 (StarPlan's default for
 * German VEVENT data).
 *
 * Pass a `fetchImpl` to override the global `fetch` (useful for tests, or to
 * inject auth headers via a wrapped fetch).
 */
export interface FetchWithCharsetOptions {
    fetchImpl?: typeof fetch;
    fallbackCharset?: string;
    headers?: Record<string, string>;
}

export async function fetchWithCharset(
    url: string,
    options: FetchWithCharsetOptions = {},
): Promise<string> {
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const fallback = options.fallbackCharset ?? 'iso-8859-1';

    const response = await fetchImpl(url, {
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache',
            ...(options.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('Content-Type') ?? '';
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    let charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : fallback;

    if (charset === 'latin1' || charset === 'latin-1') charset = 'iso-8859-1';
    if (charset === 'utf8') charset = 'utf-8';

    const buffer = await response.arrayBuffer();
    // TextDecoder accepts any IANA encoding label string at runtime; the lib
    // type is narrower than the actual contract.
    return new TextDecoder(charset as never).decode(buffer);
}
