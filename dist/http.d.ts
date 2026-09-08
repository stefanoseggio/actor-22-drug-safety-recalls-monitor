export declare class HttpError extends Error {
    readonly status: number;
    readonly url: string;
    /** Parsed `Retry-After` header value in milliseconds, or null if the header was absent/unparseable. Authoritative over computed backoff when present - the server is telling us exactly how long to wait. */
    readonly retryAfterMs: number | null;
    constructor(message: string, status: number, url: string, 
    /** Parsed `Retry-After` header value in milliseconds, or null if the header was absent/unparseable. Authoritative over computed backoff when present - the server is telling us exactly how long to wait. */
    retryAfterMs?: number | null);
}
/** Plain fetch()-with-exponential-backoff-and-jitter retry against a fully-qualified URL, honoring `Retry-After` on 429/503 when the server sends one. No proxy - both targets are verified open (see comment block above). */
export declare function fetchTextWithRetry(url: string, init?: RequestInit, maxRetries?: number, baseDelayMs?: number): Promise<string>;
/** JSON convenience wrapper over fetchTextWithRetry - both FDA and EMA targets are JSON APIs/exports. */
export declare function fetchJsonWithRetry<T>(url: string, init?: RequestInit, maxRetries?: number, baseDelayMs?: number): Promise<T>;
//# sourceMappingURL=http.d.ts.map