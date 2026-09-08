import { fdaDateRangeWindow } from '../dateUtils.js';
import { fetchJsonWithRetry } from '../http.js';
import type { DateRangePreset, FdaClassification } from '../schemas.js';

/**
 * Raw record shape from https://api.fda.gov/drug/enforcement.json, copied
 * field-for-field from a REAL live response captured this session (see
 * test/fixtures/fda_enforcement_sample.json) - not assumed from memory.
 * `termination_date` and `more_code_info` are genuinely optional: they are
 * present only once a recall reaches Terminated status / when the source
 * system has supplementary code info, respectively, and are simply absent
 * from the JSON object otherwise (openFDA never sends `null` for these -
 * the key is just missing).
 */
export interface FdaEnforcementRawRecord {
    status: string;
    city: string;
    state: string;
    country: string;
    classification: string;
    openfda: Record<string, unknown>;
    product_type: string;
    event_id: string;
    recalling_firm: string;
    address_1: string;
    address_2: string;
    postal_code: string;
    voluntary_mandated: string;
    initial_firm_notification: string;
    distribution_pattern: string;
    recall_number: string;
    product_description: string;
    product_quantity: string;
    reason_for_recall: string;
    recall_initiation_date: string;
    center_classification_date?: string;
    termination_date?: string;
    report_date: string;
    code_info?: string;
    more_code_info?: string;
}

interface FdaEnforcementResponse {
    meta: { results: { skip: number; limit: number; total: number } };
    results: FdaEnforcementRawRecord[];
}

const FDA_ENFORCEMENT_URL = 'https://api.fda.gov/drug/enforcement.json';
/** Verified live 2026-09-07: a limit above 1000 returns HTTP 400 BAD_REQUEST ("Limit cannot exceed 1000 results for search requests. Use the skip or search_after param to get additional results."). */
const FDA_MAX_LIMIT_PER_REQUEST = 1000;

function buildSearchClause(dateRange: DateRangePreset | undefined, classification: FdaClassification[] | undefined, now: Date): string | undefined {
    const clauses: string[] = [];
    if (classification?.length) {
        clauses.push(`(${classification.map((c) => `classification:"${c}"`).join('+')})`);
    }
    const window = fdaDateRangeWindow(dateRange, now);
    if (window) {
        clauses.push(`report_date:[${window.from}+TO+${window.to}]`);
    }
    return clauses.length ? clauses.join('+AND+') : undefined;
}

export interface FetchFdaEnforcementOptions {
    maxItems: number;
    dateRange?: DateRangePreset;
    classification?: FdaClassification[];
    apiKey?: string;
    now: Date;
}

/**
 * Fetches up to `maxItems` FDA drug enforcement (recall) records, newest
 * first by report_date, transparently paginating via `skip` past openFDA's
 * 1000-per-request cap (verified live above) when `maxItems` exceeds it.
 */
export async function fetchFdaEnforcementRecords(options: FetchFdaEnforcementOptions): Promise<FdaEnforcementRawRecord[]> {
    const { maxItems, dateRange, classification, apiKey, now } = options;
    const searchClause = buildSearchClause(dateRange, classification, now);

    const records: FdaEnforcementRawRecord[] = [];
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
        if (skip > 0) params.set('skip', String(skip));
        if (apiKey) params.set('api_key', apiKey);
        const query = searchClause ? `search=${searchClause}&${params.toString()}` : params.toString();

        const url = `${FDA_ENFORCEMENT_URL}?${query}`;
        const page = await fetchJsonWithRetry<FdaEnforcementResponse>(url);
        const pageResults = page.results ?? [];
        records.push(...pageResults);

        const total = page.meta?.results?.total ?? pageResults.length;
        skip += pageResults.length;
        if (pageResults.length === 0 || skip >= total) break;
    }
    return records.slice(0, maxItems);
}
