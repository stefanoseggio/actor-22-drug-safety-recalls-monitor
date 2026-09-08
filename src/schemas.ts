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

// ---------------------------------------------------------------------------
// Actor input
// ---------------------------------------------------------------------------

export const SourceKeySchema = z.enum(['fda', 'ema']);
export type SourceKey = z.infer<typeof SourceKeySchema>;

export const DateRangePresetSchema = z.enum(['24h', '7d', '30d']);
export type DateRangePreset = z.infer<typeof DateRangePresetSchema>;

export const FdaClassificationSchema = z.enum(['Class I', 'Class II', 'Class III']);
export type FdaClassification = z.infer<typeof FdaClassificationSchema>;

export const ActorInputSchema = z.object({
    sources: z.array(SourceKeySchema).min(1).default(['fda', 'ema']),
    maxItemsPerSource: z.number().int().min(1).max(5000).default(100),
    onlyNew: z.boolean().default(false),
    dateRange: DateRangePresetSchema.optional(),
    fdaClassification: z.array(FdaClassificationSchema).optional(),
    fdaApiKey: z.string().optional(),
});
export type ActorInput = z.infer<typeof ActorInputSchema>;

// ---------------------------------------------------------------------------
// Unified Master Schema (UMS) - 18 fields, exact crosswalk with
// services/enterprise-sdks/node/src/types.ts:UnifiedRecord, plus the
// mandatory disclaimer.
// ---------------------------------------------------------------------------

export const JurisdictionSchema = z.enum(['US', 'EU']);
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
export const UmsEventTypeSchema = z.union([
    z.enum(['NEW_LISTING', 'STATUS_CHANGE', 'UPDATED', 'SANCTION', 'SNAPSHOT_NO_DIFF']),
    z.string(),
]);

/**
 * Mandatory, non-removable regulatory-data disclaimer. This actor touches
 * pharmaceutical safety data (explicit health/legal compliance requirement
 * in the task brief), so every record - regardless of source or downstream
 * field (e.g. `classification`/`dhpcType` severity tiers) - must carry this
 * exact text in the SAME record object. Fixed as a z.literal so a normalizer
 * bug that drops or mutates it fails validation immediately rather than
 * silently shipping an unflagged record.
 */
export const REGULATORY_DATA_DISCLAIMER =
    "This record is sourced directly from the named regulator's own public enforcement/safety-communication feed " +
    '(US FDA openFDA drug enforcement API, or EU EMA Direct Healthcare Professional Communications). It has not ' +
    'been independently medically verified by this actor, may not reflect the regulator\'s current live status, ' +
    'and is not intended as clinical or consumer medical advice. Consult the source regulator and a qualified ' +
    'healthcare professional before making any medical or clinical decision.';

export const UnifiedRecordEnvelopeSchema = z.object({
    record_id: z.string(),
    event_type: UmsEventTypeSchema,
    scraped_at: z.string(),
    is_new: z.boolean().nullable(),
    source_url: z.string().nullable(),
    recipient_or_defendant_name: z.string().nullable(),
    entity_identifier_native: z.string().nullable(),
    value_native: z.string().nullable(),
    value_currency: z.string().nullable(),
    value_usd_normalized: z.number().nullable(),
    effective_date_iso: z.string().nullable(),
    publish_date_iso: z.string().nullable(),
    category_or_type: z.string().nullable(),
    status_or_estado: z.string().nullable(),
    awarding_or_regulating_agency: z.string().nullable(),
    jurisdiction: JurisdictionSchema,
    source_document_url: z.string().nullable(),
    reference_number: z.string().nullable(),
    regulatoryDataDisclaimer: z.literal(REGULATORY_DATA_DISCLAIMER),
});
export type UnifiedRecordEnvelope = z.infer<typeof UnifiedRecordEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Per-source records: envelope + native fields, discriminated by
// `recordSource`. Mirrors uk-hse-enforcement-monitor's ConvictionRecord |
// NoticeRecord discriminated union - each source keeps its own native
// vocabulary alongside the shared UMS envelope, rather than forcing both
// into one lossy shape.
// ---------------------------------------------------------------------------

export const FdaRecallRecordSchema = UnifiedRecordEnvelopeSchema.extend({
    recordSource: z.literal('fda_enforcement'),
    classification: z.string().nullable(),
    productDescription: z.string().nullable(),
    reasonForRecall: z.string().nullable(),
    recallingFirm: z.string().nullable(),
    distributionPattern: z.string().nullable(),
    voluntaryMandated: z.string().nullable(),
    recallNumber: z.string().nullable(),
    eventId: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
});
export type FdaRecallRecord = z.infer<typeof FdaRecallRecordSchema>;

export const EmaAlertRecordSchema = UnifiedRecordEnvelopeSchema.extend({
    recordSource: z.literal('ema_dhpc'),
    nameOfMedicine: z.string().nullable(),
    activeSubstances: z.string().nullable(),
    dhpcType: z.string().nullable(),
    atcCodeHuman: z.string().nullable(),
    therapeuticAreaMesh: z.string().nullable(),
    procedureNumber: z.string().nullable(),
    regulatoryOutcome: z.string().nullable(),
});
export type EmaAlertRecord = z.infer<typeof EmaAlertRecordSchema>;

export const DrugSafetyRecordSchema = z.discriminatedUnion('recordSource', [FdaRecallRecordSchema, EmaAlertRecordSchema]);
export type DrugSafetyRecord = z.infer<typeof DrugSafetyRecordSchema>;

/** Convenience alias matching the required-files naming ("UnifiedRecordSchema") - the actual output records are the discriminated union above, which is a strict superset of this envelope on every record. */
export const UnifiedRecordSchema = UnifiedRecordEnvelopeSchema;
