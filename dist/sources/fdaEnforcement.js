import { fdaDateRangeWindow } from '../dateUtils.js';
import { fetchJsonWithRetry } from '../http.js';
const FDA_ENFORCEMENT_URL = 'https://api.fda.gov/drug/enforcement.json';
/** Verified live 2026-09-07: a limit above 1000 returns HTTP 400 BAD_REQUEST ("Limit cannot exceed 1000 results for search requests. Use the skip or search_after param to get additional results."). */
const FDA_MAX_LIMIT_PER_REQUEST = 1000;
function buildSearchClause(dateRange, classification, now) {
    const clauses = [];
    if (classification?.length) {
        clauses.push(`(${classification.map((c) => `classification:"${c}"`).join('+')})`);
    }
    const window = fdaDateRangeWindow(dateRange, now);
    if (window) {
        clauses.push(`report_date:[${window.from}+TO+${window.to}]`);
    }
    return clauses.length ? clauses.join('+AND+') : undefined;
}
/**
 * Fetches up to `maxItems` FDA drug enforcement (recall) records, newest
 * first by report_date, transparently paginating via `skip` past openFDA's
 * 1000-per-request cap (verified live above) when `maxItems` exceeds it.
 */
export async function fetchFdaEnforcementRecords(options) {
    const { maxItems, dateRange, classification, apiKey, now } = options;
    const searchClause = buildSearchClause(dateRange, classification, now);
    const records = [];
    let skip = 0;
    while (records.length < maxItems) {
        const limit = Math.min(FDA_MAX_LIMIT_PER_REQUEST, maxItems - records.length);
        // URLSearchParams percent-encodes `+` inside the search clause (which
        // openFDA's own query syntax uses as a literal token separator), so
        // the clause is appended as a raw query-string segment instead - it
        // is already fully sanitized (fixed field names + zod-validated enum
        // classification values interpolated above, no free-form user text).
        const params = new URLSearchParams();
        params.set('sort', 'report_date:desc');
        params.set('limit', String(limit));
        if (skip > 0)
            params.set('skip', String(skip));
        if (apiKey)
            params.set('api_key', apiKey);
        const query = searchClause ? `search=${searchClause}&${params.toString()}` : params.toString();
        const url = `${FDA_ENFORCEMENT_URL}?${query}`;
        const page = await fetchJsonWithRetry(url);
        const pageResults = page.results ?? [];
        records.push(...pageResults);
        const total = page.meta?.results?.total ?? pageResults.length;
        skip += pageResults.length;
        if (pageResults.length === 0 || skip >= total)
            break;
    }
    return records.slice(0, maxItems);
}
//# sourceMappingURL=fdaEnforcement.js.map