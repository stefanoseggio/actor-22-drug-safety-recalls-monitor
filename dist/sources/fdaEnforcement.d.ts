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
export declare function fetchFdaEnforcementRecords(options: FetchFdaEnforcementOptions): Promise<FdaEnforcementRawRecord[]>;
//# sourceMappingURL=fdaEnforcement.d.ts.map