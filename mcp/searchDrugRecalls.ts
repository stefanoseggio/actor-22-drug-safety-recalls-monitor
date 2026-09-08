/**
 * MCP tool spec for this actor, in the exact real registration pattern read
 * directly from services/mcp-gateway/src/mcp/tools/searchGovernmentTenders.ts
 * + services/schemas/searchGovernmentTenders.ts (both read-only this
 * session; this file does NOT import from services/mcp-gateway - actor-22 is
 * a self-contained package per its own build boundary, so it declares a
 * minimal local ToolContext rather than depending on that gateway's
 * QueryRouter/UsageSink/ApiKeyRecord types):
 *   zod input schema -> tool module exporting TOOL_NAME, description,
 *   inputSchema, jsonSchema = zodToJsonSchema(inputSchema, TOOL_NAME), and
 *   an async handler(input, ctx).
 *
 * Unlike the fleet gateway's tools (which query an already-ingested,
 * cached, multi-actor store via QueryRouter), this tool's handler calls
 * this actor's OWN source-fetch + normalize pipeline directly and
 * in-process - a lightweight, unbilled lookup path suitable for wrapping a
 * single Apify actor as an MCP tool without requiring the full gateway
 * infrastructure this actor is not part of.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { fetchFdaEnforcementRecords } from '../src/sources/fdaEnforcement.js';
import { fetchEmaDhpcRecords } from '../src/sources/emaAlerts.js';
import { normalizeFdaRecord, normalizeEmaRecord } from '../src/umsNormalizer.js';
import { SourceKeySchema, DateRangePresetSchema, FdaClassificationSchema, type DrugSafetyRecord } from '../src/schemas.js';

export const TOOL_NAME = 'search_drug_recalls';

export const SEARCH_DRUG_RECALLS_DESCRIPTION =
    "Searches regulatory drug-safety records combining the FDA's openFDA drug enforcement (recall) API (US) and the EMA's Direct Healthcare Professional Communications safety-alert feed (EU) into one Unified-Master-Schema-normalized stream. " +
    'jurisdiction selects which regulator(s) to query (fda, ema, or both - default both). keywords does a case-insensitive substring match against the recalling firm/product description (FDA) or medicine name/active substances (EMA). ' +
    "fda_classification filters FDA results only by recall severity tier (Class I = most severe) and is ignored for EMA, which has no equivalent tiering. date_range filters by each source's own date field (FDA report_date; EMA dissemination_date). " +
    'Every returned record carries a mandatory regulatoryDataDisclaimer field: this data is sourced directly from each regulator\'s own public feed, is not independently medically verified by this tool, and is not intended as clinical or consumer medical advice.';

export const searchDrugRecallsInputSchema = z.object({
    jurisdiction: z.array(SourceKeySchema).min(1).default(['fda', 'ema']).describe('One or both of: fda (US), ema (EU).'),
    keywords: z.string().optional().describe('Free-text substring match against firm/product (FDA) or medicine/active-substance (EMA) fields.'),
    fda_classification: z.array(FdaClassificationSchema).optional().describe('FDA-only recall severity filter (Class I/II/III). Ignored for EMA.'),
    date_range: DateRangePresetSchema.optional().describe("Filters by each source's own date field."),
    max_results: z.coerce.number().int().min(1).max(500).default(50).describe('Cap on total records returned across all selected jurisdictions.'),
});
export type SearchDrugRecallsInput = z.infer<typeof searchDrugRecallsInputSchema>;

export const inputSchema = searchDrugRecallsInputSchema;
/** Real JSON Schema derived from the single zod source above - not hand-duplicated, matching the gateway's own pattern. */
export const jsonSchema = zodToJsonSchema(searchDrugRecallsInputSchema, TOOL_NAME);
export const description = SEARCH_DRUG_RECALLS_DESCRIPTION;

export interface ToolContext {
    /** Minimal local context - unlike the gateway's ToolContext (queryRouter/usageSink/apiKey), this tool has no shared fleet infrastructure to inject; present for signature-compatibility with the real registration pattern and to carry an optional caller-supplied openFDA API key. */
    fdaApiKey?: string;
}

export interface SearchDrugRecallsOutput {
    query_id: string;
    result_count: number;
    jurisdictions_queried: string[];
    records: DrugSafetyRecord[];
}

let queryCounter = 0;

function matchesKeywords(record: DrugSafetyRecord, keywords: string | undefined): boolean {
    if (!keywords) return true;
    const needle = keywords.toLowerCase();
    const haystack =
        record.recordSource === 'fda_enforcement'
            ? `${record.recallingFirm ?? ''} ${record.productDescription ?? ''}`
            : `${record.nameOfMedicine ?? ''} ${record.activeSubstances ?? ''}`;
    return haystack.toLowerCase().includes(needle);
}

export async function handler(input: SearchDrugRecallsInput, ctx: ToolContext = {}): Promise<SearchDrugRecallsOutput> {
    const now = new Date();
    const scrapedAt = now.toISOString();
    const records: DrugSafetyRecord[] = [];

    if (input.jurisdiction.includes('fda')) {
        const raw = await fetchFdaEnforcementRecords({
            maxItems: input.max_results,
            dateRange: input.date_range,
            classification: input.fda_classification,
            apiKey: ctx.fdaApiKey,
            now,
        });
        records.push(...raw.map((r) => normalizeFdaRecord(r, { scrapedAt, isNew: null })));
    }

    if (input.jurisdiction.includes('ema')) {
        const raw = await fetchEmaDhpcRecords({ maxItems: input.max_results, dateRange: input.date_range, now });
        records.push(...raw.map((r) => normalizeEmaRecord(r, { scrapedAt, isNew: null })));
    }

    const filtered = records.filter((r) => matchesKeywords(r, input.keywords)).slice(0, input.max_results);

    queryCounter += 1;
    return {
        query_id: `qry_${Date.now().toString(36)}_${queryCounter}`,
        result_count: filtered.length,
        jurisdictions_queried: input.jurisdiction,
        records: filtered,
    };
}
