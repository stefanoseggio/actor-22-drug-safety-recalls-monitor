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
export interface FetchEmaDhpcOptions {
    maxItems: number;
    dateRange?: DateRangePreset;
    now: Date;
}
export declare function fetchEmaDhpcRecords(options: FetchEmaDhpcOptions): Promise<EmaDhpcRawRecord[]>;
//# sourceMappingURL=emaAlerts.d.ts.map