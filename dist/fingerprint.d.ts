export interface RecordFingerprint {
    /** Hash over ONLY the record's status/regulatory-outcome field(s) - kept separate from contentFingerprint so a status transition (e.g. FDA Ongoing -> Terminated) can be distinguished from any other content edit. */
    statusFingerprint: string;
    /** Hash over the record's other mutable fields (never the identity fields already encoded in record_id, and never the status field, tracked separately above). */
    contentFingerprint: string;
}
/**
 * FDA drug enforcement record fingerprint. `status` (Ongoing/Terminated/
 * Completed, verified against test/fixtures/fda_enforcement_sample.json) is
 * the status signal. The remaining fields below are the ones that could
 * plausibly be corrected/supplemented on a re-fetch of the SAME
 * recall_number without the status itself changing (a classification
 * correction, added code_info, an updated distribution_pattern) - verified
 * against this actor's own FdaEnforcementRawRecord shape in
 * sources/fdaEnforcement.ts. recall_number/event_id are identity fields
 * already encoded in record_id, so they're excluded here on purpose - a
 * fingerprint over an identity field can never usefully change.
 */
export declare function fdaFingerprintOf(raw: {
    status: string;
    classification: string;
    product_description: string;
    reason_for_recall: string;
    distribution_pattern: string;
    voluntary_mandated: string;
    termination_date?: string;
    code_info?: string;
    more_code_info?: string;
}): RecordFingerprint;
/**
 * EMA DHPC record fingerprint. `regulatory_outcome` (e.g. "Revocation",
 * verified on the live-captured Tavneos fixture) is this source's status
 * signal - the closest EU analog to FDA's `status` field. The remaining
 * fields are content that could be corrected/supplemented on a re-fetch of
 * the same DHPC (dhpc_type reclassified, therapeutic area corrected, a
 * last_updated_date bump) without regulatory_outcome itself changing.
 * dhpc_url/slug is the identity field already encoded in record_id, and is
 * excluded here for the same reason recall_number is excluded above.
 */
export declare function emaFingerprintOf(raw: {
    regulatory_outcome: string;
    name_of_medicine: string;
    active_substances: string;
    dhpc_type: string;
    atc_code_human: string;
    therapeutic_area_mesh: string;
    procedure_number: string;
    referral_name: string;
    last_updated_date: string;
}): RecordFingerprint;
//# sourceMappingURL=fingerprint.d.ts.map