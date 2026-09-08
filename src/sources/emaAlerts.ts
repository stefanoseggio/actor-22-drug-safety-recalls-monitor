import { isWithinDateRange, parseEuDateToIso } from '../dateUtils.js';
import { fetchJsonWithRetry } from '../http.js';
import type { DateRangePreset } from '../schemas.js';

/**
 * Raw record shape from
 * https://www.ema.europa.eu/en/documents/report/dhpc-output-json-report_en.json,
 * copied field-for-field from a REAL live response captured this session
 * (see test/fixtures/ema_dhpc_sample.json) - not assumed from memory. Empty
 * string (not null/absent) is how EMA represents "not applicable/not yet
 * known" for every optional field in this export - verified against both
 * captured fixture records (e.g. `procedure_number: ""` on the Jentadueto
 * record).
 */
export interface EmaDhpcRawRecord {
    category: string;
    name_of_medicine: string;
    procedure_number: string;
    active_substances: string;
    dhpc_type: string;
    regulatory_outcome: string;
    referral_name: string;
    atc_code_human: string;
    atcvet_code_veterinary: string;
    therapeutic_area_mesh: string;
    species: string;
    other_related_medicines_nationally_authorised: string;
    dissemination_date: string;
    first_published_date: string;
    last_updated_date: string;
    dhpc_url: string;
}

interface EmaDhpcResponse {
    meta: { total_records: number; timestamp: string };
    data: EmaDhpcRawRecord[];
}

/**
 * EMA does not run a general safety-alert REST API; this JSON export is the
 * genuinely structured, open source verified live for this actor (see the
 * verified-target comment block in ../http.ts for the full verification
 * record: robots.txt explicitly allows this path, no CAPTCHA/WAF, updated
 * twice daily). Referrals (referrals-output-json-report_en.json) was also
 * confirmed live and structurally identical in shape, but DHPCs are the
 * closer analog to an FDA-style safety alert/recall communication and are
 * the one implemented here; the referrals feed is a documented extension
 * point, not a silent gap.
 */
const EMA_DHPC_JSON_URL = 'https://www.ema.europa.eu/en/documents/report/dhpc-output-json-report_en.json';

/** EMA's JSON export is a full snapshot per fetch (no server-side pagination or date filtering) - sort/filter/cap client-side after one download. */
function sortNewestFirst(records: EmaDhpcRawRecord[]): EmaDhpcRawRecord[] {
    return [...records].sort((a, b) => {
        const aIso = parseEuDateToIso(a.dissemination_date) ?? parseEuDateToIso(a.first_published_date);
        const bIso = parseEuDateToIso(b.dissemination_date) ?? parseEuDateToIso(b.first_published_date);
        return (bIso ? Date.parse(bIso) : 0) - (aIso ? Date.parse(aIso) : 0);
    });
}

export interface FetchEmaDhpcOptions {
    maxItems: number;
    dateRange?: DateRangePreset;
    now: Date;
}

export async function fetchEmaDhpcRecords(options: FetchEmaDhpcOptions): Promise<EmaDhpcRawRecord[]> {
    const { maxItems, dateRange, now } = options;
    const response = await fetchJsonWithRetry<EmaDhpcResponse>(EMA_DHPC_JSON_URL);
    let records = sortNewestFirst(response.data ?? []);

    if (dateRange) {
        records = records.filter((record) => {
            const iso = parseEuDateToIso(record.dissemination_date) ?? parseEuDateToIso(record.first_published_date);
            return isWithinDateRange(iso, dateRange, now);
        });
    }

    return records.slice(0, maxItems);
}
