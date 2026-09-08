/**
 * zod schemas for this actor's input contract and its Unified Master Schema
 * (UMS) output envelope.
 *
 * The UMS shape (18 fields) is copied field-for-field from the fleet's real
 * `UnifiedRecord` interface in
 * services/enterprise-sdks/node/src/types.ts (read, not imported - actor-22
 * is a self-contained package per its build boundary and does not depend on
 * `services/`). Null any field that doesn't apply to a given source, exactly
 * as that fleet-wide contract requires.
 *
 * This actor adds exactly one mandatory field beyond the 18-field UMS
 * envelope: `regulatoryDataDisclaimer`. It is a zod `z.literal()` of a fixed
 * string, not a free-form `string | null` - that is a deliberate mechanism,
 * not a stylistic choice: `UnifiedRecordSchema.parse()` will THROW if any
 * code path ever tries to emit a record without this exact disclaimer text,
 * so the guarantee is enforced at runtime by the schema itself, not merely
 * documented in a comment. See umsNormalizer.ts, which is the only place
 * that constructs records, and test/umsNormalizer.test.ts, which asserts the
 * disclaimer is present on every normalized record from both sources.
 */
import { z } from 'zod';
export declare const SourceKeySchema: z.ZodEnum<["fda", "ema"]>;
export type SourceKey = z.infer<typeof SourceKeySchema>;
export declare const DateRangePresetSchema: z.ZodEnum<["24h", "7d", "30d"]>;
export type DateRangePreset = z.infer<typeof DateRangePresetSchema>;
export declare const FdaClassificationSchema: z.ZodEnum<["Class I", "Class II", "Class III"]>;
export type FdaClassification = z.infer<typeof FdaClassificationSchema>;
export declare const ActorInputSchema: z.ZodObject<{
    sources: z.ZodDefault<z.ZodArray<z.ZodEnum<["fda", "ema"]>, "many">>;
    maxItemsPerSource: z.ZodDefault<z.ZodNumber>;
    onlyNew: z.ZodDefault<z.ZodBoolean>;
    dateRange: z.ZodOptional<z.ZodEnum<["24h", "7d", "30d"]>>;
    fdaClassification: z.ZodOptional<z.ZodArray<z.ZodEnum<["Class I", "Class II", "Class III"]>, "many">>;
    fdaApiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sources: ("fda" | "ema")[];
    maxItemsPerSource: number;
    onlyNew: boolean;
    dateRange?: "24h" | "7d" | "30d" | undefined;
    fdaClassification?: ("Class I" | "Class II" | "Class III")[] | undefined;
    fdaApiKey?: string | undefined;
}, {
    sources?: ("fda" | "ema")[] | undefined;
    maxItemsPerSource?: number | undefined;
    onlyNew?: boolean | undefined;
    dateRange?: "24h" | "7d" | "30d" | undefined;
    fdaClassification?: ("Class I" | "Class II" | "Class III")[] | undefined;
    fdaApiKey?: string | undefined;
}>;
export type ActorInput = z.infer<typeof ActorInputSchema>;
export declare const JurisdictionSchema: z.ZodEnum<["US", "EU"]>;
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;
/**
 * This actor's real event-type vocabulary, plus an open string escape hatch
 * matching the shared fleet contract's UmsEventType | (string & {}) shape.
 * `AWARD_VARIATION` (a tender/contract-award concept, irrelevant to drug
 * safety data) was removed from a prior draft of this enum - it was declared
 * but never assignable from this actor's own domain. `STATUS_CHANGE` was
 * added: it's now genuinely computed (src/delta.ts), not just documented
 * intent - a status transition (FDA Ongoing -> Terminated,
 * EMA regulatory_outcome change) is a real, distinct signal from a generic
 * content UPDATED. See src/delta.ts for the full classification logic.
 */
export declare const UmsEventTypeSchema: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
/**
 * Mandatory, non-removable regulatory-data disclaimer. This actor touches
 * pharmaceutical safety data (explicit health/legal compliance requirement
 * in the task brief), so every record - regardless of source or downstream
 * field (e.g. `classification`/`dhpcType` severity tiers) - must carry this
 * exact text in the SAME record object. Fixed as a z.literal so a normalizer
 * bug that drops or mutates it fails validation immediately rather than
 * silently shipping an unflagged record.
 */
export declare const REGULATORY_DATA_DISCLAIMER: string;
export declare const UnifiedRecordEnvelopeSchema: z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodEnum<["US", "EU"]>;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
    regulatoryDataDisclaimer: z.ZodLiteral<string>;
}, "strip", z.ZodTypeAny, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
}, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
}>;
export type UnifiedRecordEnvelope = z.infer<typeof UnifiedRecordEnvelopeSchema>;
export declare const FdaRecallRecordSchema: z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodEnum<["US", "EU"]>;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
    regulatoryDataDisclaimer: z.ZodLiteral<string>;
} & {
    recordSource: z.ZodLiteral<"fda_enforcement">;
    classification: z.ZodNullable<z.ZodString>;
    productDescription: z.ZodNullable<z.ZodString>;
    reasonForRecall: z.ZodNullable<z.ZodString>;
    recallingFirm: z.ZodNullable<z.ZodString>;
    distributionPattern: z.ZodNullable<z.ZodString>;
    voluntaryMandated: z.ZodNullable<z.ZodString>;
    recallNumber: z.ZodNullable<z.ZodString>;
    eventId: z.ZodNullable<z.ZodString>;
    city: z.ZodNullable<z.ZodString>;
    state: z.ZodNullable<z.ZodString>;
    country: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "fda_enforcement";
    classification: string | null;
    productDescription: string | null;
    reasonForRecall: string | null;
    recallingFirm: string | null;
    distributionPattern: string | null;
    voluntaryMandated: string | null;
    recallNumber: string | null;
    eventId: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
}, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "fda_enforcement";
    classification: string | null;
    productDescription: string | null;
    reasonForRecall: string | null;
    recallingFirm: string | null;
    distributionPattern: string | null;
    voluntaryMandated: string | null;
    recallNumber: string | null;
    eventId: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
}>;
export type FdaRecallRecord = z.infer<typeof FdaRecallRecordSchema>;
export declare const EmaAlertRecordSchema: z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodEnum<["US", "EU"]>;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
    regulatoryDataDisclaimer: z.ZodLiteral<string>;
} & {
    recordSource: z.ZodLiteral<"ema_dhpc">;
    nameOfMedicine: z.ZodNullable<z.ZodString>;
    activeSubstances: z.ZodNullable<z.ZodString>;
    dhpcType: z.ZodNullable<z.ZodString>;
    atcCodeHuman: z.ZodNullable<z.ZodString>;
    therapeuticAreaMesh: z.ZodNullable<z.ZodString>;
    procedureNumber: z.ZodNullable<z.ZodString>;
    regulatoryOutcome: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "ema_dhpc";
    nameOfMedicine: string | null;
    activeSubstances: string | null;
    dhpcType: string | null;
    atcCodeHuman: string | null;
    therapeuticAreaMesh: string | null;
    procedureNumber: string | null;
    regulatoryOutcome: string | null;
}, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "ema_dhpc";
    nameOfMedicine: string | null;
    activeSubstances: string | null;
    dhpcType: string | null;
    atcCodeHuman: string | null;
    therapeuticAreaMesh: string | null;
    procedureNumber: string | null;
    regulatoryOutcome: string | null;
}>;
export type EmaAlertRecord = z.infer<typeof EmaAlertRecordSchema>;
export declare const DrugSafetyRecordSchema: z.ZodDiscriminatedUnion<"recordSource", [z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodEnum<["US", "EU"]>;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
    regulatoryDataDisclaimer: z.ZodLiteral<string>;
} & {
    recordSource: z.ZodLiteral<"fda_enforcement">;
    classification: z.ZodNullable<z.ZodString>;
    productDescription: z.ZodNullable<z.ZodString>;
    reasonForRecall: z.ZodNullable<z.ZodString>;
    recallingFirm: z.ZodNullable<z.ZodString>;
    distributionPattern: z.ZodNullable<z.ZodString>;
    voluntaryMandated: z.ZodNullable<z.ZodString>;
    recallNumber: z.ZodNullable<z.ZodString>;
    eventId: z.ZodNullable<z.ZodString>;
    city: z.ZodNullable<z.ZodString>;
    state: z.ZodNullable<z.ZodString>;
    country: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "fda_enforcement";
    classification: string | null;
    productDescription: string | null;
    reasonForRecall: string | null;
    recallingFirm: string | null;
    distributionPattern: string | null;
    voluntaryMandated: string | null;
    recallNumber: string | null;
    eventId: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
}, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "fda_enforcement";
    classification: string | null;
    productDescription: string | null;
    reasonForRecall: string | null;
    recallingFirm: string | null;
    distributionPattern: string | null;
    voluntaryMandated: string | null;
    recallNumber: string | null;
    eventId: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
}>, z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodEnum<["US", "EU"]>;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
    regulatoryDataDisclaimer: z.ZodLiteral<string>;
} & {
    recordSource: z.ZodLiteral<"ema_dhpc">;
    nameOfMedicine: z.ZodNullable<z.ZodString>;
    activeSubstances: z.ZodNullable<z.ZodString>;
    dhpcType: z.ZodNullable<z.ZodString>;
    atcCodeHuman: z.ZodNullable<z.ZodString>;
    therapeuticAreaMesh: z.ZodNullable<z.ZodString>;
    procedureNumber: z.ZodNullable<z.ZodString>;
    regulatoryOutcome: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "ema_dhpc";
    nameOfMedicine: string | null;
    activeSubstances: string | null;
    dhpcType: string | null;
    atcCodeHuman: string | null;
    therapeuticAreaMesh: string | null;
    procedureNumber: string | null;
    regulatoryOutcome: string | null;
}, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
    recordSource: "ema_dhpc";
    nameOfMedicine: string | null;
    activeSubstances: string | null;
    dhpcType: string | null;
    atcCodeHuman: string | null;
    therapeuticAreaMesh: string | null;
    procedureNumber: string | null;
    regulatoryOutcome: string | null;
}>]>;
export type DrugSafetyRecord = z.infer<typeof DrugSafetyRecordSchema>;
/** Convenience alias matching the required-files naming ("UnifiedRecordSchema") - the actual output records are the discriminated union above, which is a strict superset of this envelope on every record. */
export declare const UnifiedRecordSchema: z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodUnion<[z.ZodEnum<["NEW_LISTING", "STATUS_CHANGE", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"]>, z.ZodString]>;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodEnum<["US", "EU"]>;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
    regulatoryDataDisclaimer: z.ZodLiteral<string>;
}, "strip", z.ZodTypeAny, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
}, {
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: "US" | "EU";
    source_document_url: string | null;
    reference_number: string | null;
    regulatoryDataDisclaimer: string;
}>;
//# sourceMappingURL=schemas.d.ts.map