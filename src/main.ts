import { Actor, log } from 'apify';

import { classifyEmaRecord,classifyFdaRecord } from './delta.js';
import { emaFingerprintOf,fdaFingerprintOf } from './fingerprint.js';
import { ActorInputSchema, type DrugSafetyRecord } from './schemas.js';
import { fetchEmaDhpcRecords } from './sources/emaAlerts.js';
import { fetchFdaEnforcementRecords } from './sources/fdaEnforcement.js';
import { loadState, type RecordEntry,saveSourceState } from './state.js';
import { normalizeEmaRecord,normalizeFdaRecord } from './umsNormalizer.js';

const RESULT_EVENT_NAME = 'result';

// ---------------------------------------------------------------------------
// PPE / cost model (fleet convention: compute = $0.25/CU-hour at 1GB,
// 2,000 req/hr => $0.000125/request; 85% margin bar: cost/record <= price *
// 0.15). This actor issues at most a handful of HTTP requests per run
// regardless of maxItemsPerSource - at most ceil(maxItemsPerSource / 1000)
// paginated calls to FDA (1 call for the default 100-item run) plus exactly
// 1 call to EMA (a full-snapshot JSON download, filtered/capped
// client-side) - so its compute cost is essentially fixed-per-run, not
// per-record, and amortizes to a very small number even on a default
// 100-200 record run:
//   ~2 requests/run * $0.000125/request = $0.00025 compute cost / run
//   $0.00025 / 150 records ~= $0.0000017 / record
// Against this fleet's existing rate card ($0.0005-$0.003/record), even the
// LOWEST listed price clears the 85% margin bar by a wide margin:
//   margin = 1 - (0.0000017 / 0.0005) ~= 99.7% >> 85%
// Live-configured PPE price (confirmed via GET acts/{id}, 2026-09-08):
// $0.001/record - unchanged by this V2 pass, already correct.
// ---------------------------------------------------------------------------

await Actor.init();
await run();
await Actor.exit();

async function run(): Promise<void> {
    const rawInput = await Actor.getInput();
    const input = ActorInputSchema.parse(rawInput ?? {});
    const { sources, maxItemsPerSource, onlyNew, dateRange, fdaClassification, fdaApiKey } = input;

    const now = new Date();
    const scrapedAt = now.toISOString();
    let state = await loadState();

    let records: DrugSafetyRecord[] = [];
    try {
        if (sources.includes('fda')) {
            const priorEntries = state.entries.fda ?? {};
            const raw = await fetchFdaEnforcementRecords({
                maxItems: maxItemsPerSource,
                dateRange,
                classification: fdaClassification,
                apiKey: fdaApiKey,
                now,
            });

            const nextEntries: Record<string, RecordEntry> = {};
            const fdaRecords = raw.map((r) => {
                const recordId = `fda:${r.recall_number}`;
                const fingerprint = fdaFingerprintOf(r);
                const previous = priorEntries[recordId];
                const eventType = classifyFdaRecord(previous, fingerprint);
                nextEntries[recordId] = { ...fingerprint, lastSeenAt: scrapedAt };
                return normalizeFdaRecord(r, { scrapedAt, isNew: !previous, eventType });
            });

            // onlyNew now means "only deliver what's new or changed since
            // last run" (NEW_LISTING/SANCTION, STATUS_CHANGE, or UPDATED),
            // not just "never seen before" - a deliberate, disclosed
            // behavior upgrade (see CHANGELOG.md) that makes the flag
            // actually useful now that STATUS_CHANGE/UPDATED exist: a
            // recall's status flipping to Terminated is exactly the kind of
            // thing a recurring monitor should surface, not silently
            // suppress because the recall itself was "seen before".
            const filtered = onlyNew ? fdaRecords.filter((r) => r.event_type !== 'SNAPSHOT_NO_DIFF') : fdaRecords;
            log.info(`FDA drug enforcement records fetched: ${fdaRecords.length} (onlyNew=${onlyNew}, kept=${filtered.length})`);
            records = records.concat(filtered);

            // Every FETCHED record's fingerprint is persisted, not just
            // delivered ones - this actor's fetch is always a bounded,
            // newest-first top-N window (never an early-stopped walk), so
            // "fetched this run" and "should be recorded as seen" are the
            // same set. Not persisting a filtered-out SNAPSHOT_NO_DIFF
            // record would be harmless (its fingerprint is unchanged
            // anyway), but persisting it keeps lastSeenAt honest.
            state = await saveSourceState(state, 'fda', nextEntries, scrapedAt);
        }

        if (sources.includes('ema')) {
            const priorEntries = state.entries.ema ?? {};
            const raw = await fetchEmaDhpcRecords({ maxItems: maxItemsPerSource, dateRange, now });

            const nextEntries: Record<string, RecordEntry> = {};
            const emaRecords = raw.map((r) => {
                const slug = r.dhpc_url.split('/').filter(Boolean).pop() ?? r.dhpc_url;
                const recordId = `ema:${slug}:${r.dissemination_date || r.first_published_date || 'undated'}`;
                const fingerprint = emaFingerprintOf(r);
                const previous = priorEntries[recordId];
                const eventType = classifyEmaRecord(previous, fingerprint);
                nextEntries[recordId] = { ...fingerprint, lastSeenAt: scrapedAt };
                return normalizeEmaRecord(r, { scrapedAt, isNew: !previous, eventType });
            });

            const filtered = onlyNew ? emaRecords.filter((r) => r.event_type !== 'SNAPSHOT_NO_DIFF') : emaRecords;
            log.info(`EMA DHPC safety-alert records fetched: ${emaRecords.length} (onlyNew=${onlyNew}, kept=${filtered.length})`);
            records = records.concat(filtered);
            state = await saveSourceState(state, 'ema', nextEntries, scrapedAt);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Extraction failed: ${message}`);
        await Actor.pushData({ error: message, scraped_at: scrapedAt });
        return;
    }

    let pushed = 0;
    for (const record of records) {
        await Actor.pushData(record);
        pushed += 1;

        const { eventChargeLimitReached } = await Actor.charge({ eventName: RESULT_EVENT_NAME, count: 1 });
        if (eventChargeLimitReached) {
            log.info('Charge limit reached - stopping.');
            return;
        }
    }

    log.info(`Pushed ${pushed} records to the dataset (sources=${sources.join(',')}).`);
}
