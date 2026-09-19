import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// impit's Impit.fetch() is a native binding, not built on the global `fetch` -
// vi.spyOn(globalThis, 'fetch')/vi.stubGlobal('fetch', ...) never intercepts
// it. Mock the `impit` module itself instead, so `new Impit()` in src/http.ts
// returns an object whose `.fetch` is this mock. vi.hoisted() is required
// because vi.mock() factories run before the top-level `const` below would
// otherwise be initialized.
const { fetchMock } = vi.hoisted(() => ({
    fetchMock: vi.fn<(url: string, init: RequestInit) => Promise<Response>>(),
}));
vi.mock('impit', () => ({
    // Must be a real `function`, not an arrow function - `new Impit(...)` in
    // src/http.ts requires a constructible mock implementation.
    Impit: vi.fn().mockImplementation(function ImpitMock() {
        return { fetch: fetchMock };
    }),
}));

import { fetchTextWithRetry, HttpError } from '../src/http.js';

function jsonResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
    return new Response(body, { status, headers });
}

describe('fetchTextWithRetry - 429/503 retry fix', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        fetchMock.mockReset();
    });

    it('retries on HTTP 429 instead of throwing immediately - the bug this fix addresses', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(429, 'Too Many Requests')).mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://api.fda.gov/drug/enforcement.json', {}, 4, 10);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('honors a numeric Retry-After header on 429 instead of the computed exponential backoff', async () => {
        const sleepSpy = vi.spyOn(globalThis, 'setTimeout');
        fetchMock
            .mockResolvedValueOnce(jsonResponse(429, 'slow down', { 'retry-after': '5' }))
            .mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://api.fda.gov/drug/enforcement.json', {}, 4, 10);
        await vi.runAllTimersAsync();
        await promise;

        // Retry-After: 5 -> 5000ms, which must be the actual scheduled
        // delay - not the tiny 10ms*2^0 computed backoff this call would
        // otherwise use.
        const delays = sleepSpy.mock.calls.map((call) => call[1]);
        expect(delays).toContain(5000);
    });

    it('retries on HTTP 503 (server-side/temporary)', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(503, 'Service Unavailable')).mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://www.ema.europa.eu/x.json', {}, 4, 10);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry a genuine 4xx client error like 400 or 404 - still the correct non-retry case', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(400, 'Bad Request'));

        await expect(fetchTextWithRetry('https://api.fda.gov/drug/enforcement.json?limit=1001', {}, 4, 10)).rejects.toThrow(HttpError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('gives up after maxRetries and throws the last error', async () => {
        fetchMock.mockResolvedValue(jsonResponse(429, 'still limited'));

        const promise = fetchTextWithRetry('https://api.fda.gov/drug/enforcement.json', {}, 2, 5);
        const assertion = expect(promise).rejects.toThrow(HttpError);
        await vi.runAllTimersAsync();
        await assertion;
    });

    it('retries a network-level failure (fetch itself throws, not an HTTP error) with exponential backoff', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('network error')).mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://www.ema.europa.eu/x.json', {}, 4, 10);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
