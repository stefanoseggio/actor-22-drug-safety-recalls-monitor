/**
 * Translates each source's raw record shape into this actor's Unified
 * Master Schema (UMS) envelope + native fields (see schemas.ts). This is
 * the ONLY place in the actor that constructs a DrugSafetyRecord - both
 * normalizeFdaRecord() and normalizeEmaRecord() build the record through
 * one shared helper (buildEnvelope) that always sets
 * `regulatoryDataDisclaimer: REGULATORY_DATA_DISCLAIMER`, and every return
 * value is validated with the corresponding zod schema's `.parse()` before
 * being handed back - so a record missing or mutating the disclaimer, or
 * missing any required UMS field, throws here rather than shipping.
 *
 * Downstream graph mapping note (for context only - actor-22 does not write
 * to Neo4j itself, see services/knowledge-graph-engine, out of this
 * package's boundary): per that ontology's own documented instruction that
 * the `Sanction` node label "covers enforcement actions" broadly, BOTH FDA
 * recalls and EMA DHPCs would ingest as `:Sanction` nodes (there is no
 * `:Contract`-shaped monetary transaction here for either source - value_*
 * fields are correctly nulled below, never guessed). Within this actor's
 * OWN `event_type` field, the two sources are given different FIRST-SEEN
 * names, mirroring uk-hse-enforcement-monitor's own convictions (SANCTION)
 * vs. notices (NEW_LISTING) split:
 *   - FDA drug enforcement record, first seen = the FDA's own
 *     recall/enforcement classification action against a firm's product ->
 *     'SANCTION'.
 *   - EMA DHPC, first seen = a newly published regulator safety
 *     communication, not itself an enforcement action against a party (many
 *     DHPC reasons are e.g. "New contraindication", not "Quality defect")
 *     -> 'NEW_LISTING'.
 * On a REPEAT sighting of a record already in persisted state, event_type is
 * instead computed by src/delta.ts against the record's fingerprint pair
 * (STATUS_CHANGE if status/regulatory_outcome differs from last time,
 * UPDATED if other tracked fields differ, SNAPSHOT_NO_DIFF if nothing did) -
 * this normalizer never hardcodes it; see NormalizeOptions.eventType below.
 */

import { parseEuDateToIso,parseFdaDateToIso } from './dateUtils.js';
import type { EmaEventType,FdaEventType } from './delta.js';
import {
    type EmaAlertRecord,
    EmaAlertRecordSchema,
    type FdaRecallRecord,
    FdaRecallRecordSchema,
    REGULATORY_DATA_DISCLAIMER,
    type UnifiedRecordEnvelope,
} from './schemas.js';
import type { EmaDhpcRawRecord } from './sources/emaAlerts.js';
import type { FdaEnforcementRawRecord } from './sources/fdaEnforcement.js';

/** Empty string -> null. Both FDA (occasionally, e.g. `state: ""`) and EMA (routinely, e.g. `procedure_number: ""`) use "" to mean "no value", verified against the live-captured fixtures. */
function emptyToNull(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed === '' || trimmed === 'N/A' ? null : trimmed;
}

function buildEnvelope(fields: Omit<UnifiedRecordEnvelope, 'regulatoryDataDisclaimer'>): UnifiedRecordEnvelope {
    return { ...fields, regulatoryDataDisclaimer: REGULATORY_DATA_DISCLAIMER };
}

export interface NormalizeOptions {
    scrapedAt: string;
    isNew: boolean | null;
    /** Computed by src/delta.ts's classifyFdaRecord/classifyEmaRecord against persisted state - null only on the MCP tool path, which has no delta-state concept, in which case the source-appropriate first-seen name is used as a reasonable default. */
    eventType: FdaEventType | EmaEventType | null;
}

export function normalizeFdaRecord(raw: FdaEnforcementRawRecord, options: NormalizeOptions): FdaRecallRecord {
    const recordId = `fda:${raw.recall_number}`;
    // openFDA exposes no stable per-recall detail page; the API request that
    // sourced this exact record is the most honest, dereferenceable
    // "source_url" available (see http.ts verified-target notes) - no HTML
    // detail page is invented in its place.
    const sourceUrl = `https://api.fda.gov/drug/enforcement.json?search=recall_number:%22${encodeURIComponent(raw.recall_number)}%22`;

    const envelope = buildEnvelope({
        record_id: recordId,
        event_type: options.eventType ?? 'SANCTION',
        scraped_at: options.scrapedAt,
        is_new: options.isNew,
        source_url: sourceUrl,
        recipient_or_defendant_name: emptyToNull(raw.recalling_firm),
        entity_identifier_native: emptyToNull(raw.event_id),
        value_native: null,
        value_currency: null,
        value_usd_normalized: null,
        effective_date_iso: parseFdaDateToIso(raw.recall_initiation_date),
        publish_date_iso: parseFdaDateToIso(raw.report_date),
        category_or_type: emptyToNull(raw.product_type),
        status_or_estado: emptyToNull(raw.status),
        awarding_or_regulating_agency: 'U.S. Food and Drug Administration (FDA)',
        jurisdiction: 'US',
        source_document_url: null,
        reference_number: emptyToNull(raw.recall_number),
    });

    return FdaRecallRecordSchema.parse({
        ...envelope,
        recordSource: 'fda_enforcement',
        classification: emptyToNull(raw.classification),
        productDescription: emptyToNull(raw.product_description),
        reasonForRecall: emptyToNull(raw.reason_for_recall),
        recallingFirm: emptyToNull(raw.recalling_firm),
        distributionPattern: emptyToNull(raw.distribution_pattern),
        voluntaryMandated: emptyToNull(raw.voluntary_mandated),
        recallNumber: emptyToNull(raw.recall_number),
        eventId: emptyToNull(raw.event_id),
        city: emptyToNull(raw.city),
        state: emptyToNull(raw.state),
        country: emptyToNull(raw.country),
    });
}

function slugFromDhpcUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] || url;
}

export function normalizeEmaRecord(raw: EmaDhpcRawRecord, options: NormalizeOptions): EmaAlertRecord {
    const effectiveDateIso = parseEuDateToIso(raw.dissemination_date);
    const publishDateIso = parseEuDateToIso(raw.first_published_date);
    // No numeric/globally-unique id field exists in this feed (verified
    // against the live capture) - slug + dissemination date is the most
    // stable composite key available, without inventing an id the source
    // doesn't provide.
    const recordId = `ema:${slugFromDhpcUrl(raw.dhpc_url)}:${raw.dissemination_date || raw.first_published_date || 'undated'}`;

    const envelope = buildEnvelope({
        record_id: recordId,
        event_type: options.eventType ?? 'NEW_LISTING',
        scraped_at: options.scrapedAt,
        is_new: options.isNew,
        source_url: emptyToNull(raw.dhpc_url),
        // No marketing-authorisation-holder/company field exists in this
        // feed - the medicine itself is the named subject of the record.
        // Never guessed at a manufacturer name the source doesn't provide.
        recipient_or_defendant_name: emptyToNull(raw.name_of_medicine),
        entity_identifier_native: emptyToNull(raw.atc_code_human),
        value_native: null,
        value_currency: null,
        value_usd_normalized: null,
        effective_date_iso: effectiveDateIso,
        publish_date_iso: publishDateIso,
        category_or_type: emptyToNull(raw.dhpc_type),
        status_or_estado: emptyToNull(raw.regulatory_outcome),
        awarding_or_regulating_agency: 'European Medicines Agency (EMA)',
        jurisdiction: 'EU',
        // The feed exposes exactly one URL per DHPC (the webpage aggregating
        // links to the actual PDF letter) - no separate document endpoint,
        // so this is correctly nulled rather than duplicating source_url.
        source_document_url: null,
        reference_number: emptyToNull(raw.procedure_number),
    });

    return EmaAlertRecordSchema.parse({
        ...envelope,
        recordSource: 'ema_dhpc',
        nameOfMedicine: emptyToNull(raw.name_of_medicine),
        activeSubstances: emptyToNull(raw.active_substances),
        dhpcType: emptyToNull(raw.dhpc_type),
        atcCodeHuman: emptyToNull(raw.atc_code_human),
        therapeuticAreaMesh: emptyToNull(raw.therapeutic_area_mesh),
        procedureNumber: emptyToNull(raw.procedure_number),
        regulatoryOutcome: emptyToNull(raw.regulatory_outcome),
    });
}
