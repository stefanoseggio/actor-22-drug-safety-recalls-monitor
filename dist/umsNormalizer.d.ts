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
import type { EmaEventType, FdaEventType } from './delta.js';
import { type EmaAlertRecord, type FdaRecallRecord } from './schemas.js';
import type { EmaDhpcRawRecord } from './sources/emaAlerts.js';
import type { FdaEnforcementRawRecord } from './sources/fdaEnforcement.js';
export interface NormalizeOptions {
    scrapedAt: string;
    isNew: boolean | null;
    /** Computed by src/delta.ts's classifyFdaRecord/classifyEmaRecord against persisted state - null only on the MCP tool path, which has no delta-state concept, in which case the source-appropriate first-seen name is used as a reasonable default. */
    eventType: FdaEventType | EmaEventType | null;
}
export declare function normalizeFdaRecord(raw: FdaEnforcementRawRecord, options: NormalizeOptions): FdaRecallRecord;
export declare function normalizeEmaRecord(raw: EmaDhpcRawRecord, options: NormalizeOptions): EmaAlertRecord;
//# sourceMappingURL=umsNormalizer.d.ts.map