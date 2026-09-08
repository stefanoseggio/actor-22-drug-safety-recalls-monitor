async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
// ---------------------------------------------------------------------------
// Verified live targets (2026-09-07) - both are genuinely open, structured,
// no-CAPTCHA, no-WAF, ToS-compliant JSON endpoints. Plain fetch(), no proxy,
// matching this fleet's compliance doctrine (no CAPTCHA-solving, no
// fingerprint spoofing, no WAF/OAuth-gate bypass).
//
// 1) FDA openFDA - https://api.fda.gov/drug/enforcement.json
//    Confirmed live this session with real unauthenticated GET requests
//    (HTTP 200, real recall records returned - see
//    test/fixtures/fda_enforcement_sample.json for the exact captured
//    shape). Documented rate limits, verified live against
//    https://open.fda.gov/apis/authentication/ on 2026-09-07:
//      - No API key:  240 requests/minute, 1,000 requests/day, per IP.
//      - With a free API key: 240 requests/minute, 120,000 requests/day,
//        per key (key passed as ?api_key=... query param, or as a Basic
//        Auth username).
//    Also confirmed live: `limit` is capped at 1000 per request (a
//    limit=1001 request returns HTTP 400 BAD_REQUEST verbatim: "Limit
//    cannot exceed 1000 results for search requests. Use the skip or
//    search_after param to get additional results."); `search=`, `sort=`,
//    and bracketed date-range syntax (e.g.
//    `report_date:[20260801 TO 20260907]`) all work exactly as documented.
//    No robots.txt restriction applies to a JSON API host; openFDA's own
//    terms (https://open.fda.gov/terms/) explicitly invite this kind of
//    public, unauthenticated use.
//
// 2) EMA - https://www.ema.europa.eu/en/documents/report/dhpc-output-json-report_en.json
//    EMA does NOT run a general-purpose safety-alert REST API, but it DOES
//    publish a genuinely structured, open JSON export of its Direct
//    Healthcare Professional Communications (DHPCs) - the EU's real
//    mechanism for regulator-issued drug safety communications, the closest
//    EU analog to an FDA recall/safety-alert feed - updated twice daily
//    (06:00 and 18:00 CET per EMA's own JSON-export documentation).
//    Confirmed live this session with a real unauthenticated GET request
//    (HTTP 200, 174 real records returned - see
//    test/fixtures/ema_dhpc_sample.json for the exact captured shape).
//    robots.txt at https://www.ema.europa.eu/robots.txt was checked live
//    and explicitly ALLOWS this exact path pattern
//    (`Allow: /*/documents/report/*.json$`), and the request needed no
//    session/cookie warm-up and hit no CAPTCHA/WAF challenge. EMA does not
//    publish a formal numeric rate limit for this export (unlike openFDA);
//    this actor therefore fetches it at most once per run and never polls
//    faster than the feed's own twice-daily publication cadence.
// ---------------------------------------------------------------------------
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 1000;
/** Jitter as a fraction of the computed backoff, to avoid a thundering-herd retry against openFDA/EMA if this actor is ever run concurrently across schedules. */
const JITTER_FRACTION = 0.25;
export class HttpError extends Error {
    status;
    url;
    retryAfterMs;
    constructor(message, status, url, 
    /** Parsed `Retry-After` header value in milliseconds, or null if the header was absent/unparseable. Authoritative over computed backoff when present - the server is telling us exactly how long to wait. */
    retryAfterMs = null) {
        super(message);
        this.status = status;
        this.url = url;
        this.retryAfterMs = retryAfterMs;
        this.name = 'HttpError';
    }
}
/**
 * `Retry-After` is either a delay in seconds (e.g. "120") or an HTTP-date
 * (e.g. "Wed, 21 Oct 2026 07:28:00 GMT") per RFC 9110 - both forms are
 * handled. Returns null (fall back to computed exponential backoff) if the
 * header is absent or neither form parses.
 */
function parseRetryAfterMs(headerValue) {
    if (!headerValue)
        return null;
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds))
        return Math.max(0, seconds * 1000);
    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs))
        return Math.max(0, dateMs - Date.now());
    return null;
}
function isRetryableStatus(status) {
    // 429 (rate limited) and 5xx (server-side/temporary) are worth retrying.
    // Other 4xx (400 bad request, 404 not found, etc.) are permanent client
    // errors - retrying an identical malformed request just wastes the
    // rate-limit budget documented above for no benefit. This is the fix for
    // the bug where 429 was previously swept into the same "don't retry any
    // 4xx" bucket as 400/404 - rate-limiting is exactly the case retries
    // exist for.
    return status === 429 || status >= 500;
}
/** Plain fetch()-with-exponential-backoff-and-jitter retry against a fully-qualified URL, honoring `Retry-After` on 429/503 when the server sends one. No proxy - both targets are verified open (see comment block above). */
export async function fetchTextWithRetry(url, init = {}, maxRetries = DEFAULT_MAX_RETRIES, baseDelayMs = DEFAULT_BASE_DELAY_MS) {
    let lastError = new Error('unreachable');
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, { redirect: 'follow', ...init });
            if (!response.ok) {
                const body = await response.text().catch(() => '');
                const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
                throw new HttpError(`HTTP ${response.status} for ${url}${body ? ` - ${body.slice(0, 300)}` : ''}`, response.status, url, retryAfterMs);
            }
            return await response.text();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (error instanceof HttpError && !isRetryableStatus(error.status)) {
                throw error;
            }
            if (attempt >= maxRetries)
                break;
            const backoffMs = baseDelayMs * 2 ** attempt;
            const jitterMs = Math.random() * backoffMs * JITTER_FRACTION;
            // Retry-After (429/503 with an explicit header) is authoritative
            // when present - the server told us exactly how long to wait, so
            // an arbitrary shorter computed backoff would just get 429'd
            // again. Fall back to exponential backoff + jitter otherwise
            // (including for network-level errors, which aren't HttpErrors
            // and so have no Retry-After to read).
            const delayMs = error instanceof HttpError && error.retryAfterMs !== null ? error.retryAfterMs : backoffMs + jitterMs;
            await sleep(delayMs);
        }
    }
    throw lastError;
}
/** JSON convenience wrapper over fetchTextWithRetry - both FDA and EMA targets are JSON APIs/exports. */
export async function fetchJsonWithRetry(url, init = {}, maxRetries = DEFAULT_MAX_RETRIES, baseDelayMs = DEFAULT_BASE_DELAY_MS) {
    const text = await fetchTextWithRetry(url, init, maxRetries, baseDelayMs);
    return JSON.parse(text);
}
//# sourceMappingURL=http.js.map