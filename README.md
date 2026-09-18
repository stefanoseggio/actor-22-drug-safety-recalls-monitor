# Drug Safety & Recall Monitor - FDA & EMA Regulatory Alerts (Global Pharma Compliance)

[![Built for Apify](https://img.shields.io/badge/Built%20for-Apify-24A6E9?style=flat-square&logo=apify&logoColor=white)](https://apify.com)
[![Pay-Per-Event](https://img.shields.io/badge/Pay--Per--Event-%240.001%2Fevent-4CAF50?style=flat-square)](https://apify.com/stefano_seggio/actor-22-drug-safety-recalls-monitor)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Apache 2.0 License](https://img.shields.io/badge/License-Apache%202.0-D22128?style=flat-square)](./LICENSE)

[![Run this Actor on Apify](https://apify.com/ext/run-on-apify.png)](https://apify.com/stefano_seggio/actor-22-drug-safety-recalls-monitor)

Monitors the FDA's openFDA drug enforcement (recall) API and the EMA's Direct Healthcare Professional Communications (DHPC) safety-alert feed — US and EU pharma safety data in one normalized, change-detected schema — on whichever schedule you configure via Apify's own Scheduler (there is no fixed built-in cadence).

## Executive Value Proposition

Checking FDA's openFDA drug enforcement database and EMA's Direct Healthcare Professional Communications (DHPC) feed separately means learning two different field structures, two different pagination behaviors, and manually diffing results run-over-run just to notice that a recall's status changed. This Actor normalizes both into one 18-field schema, tagged by jurisdiction and regulating agency and sorted newest-first, and can be scheduled to surface only what's new or changed since the last run instead of the full list every time. What would otherwise be two separate manual feed checks - and a spreadsheet to track what you've already seen - becomes one scheduled Actor run with structured, exportable output and a dedicated "Change detection" dataset view for what's new or different since last time.

## Who uses this

- **Pharmacovigilance and drug-safety teams** - track recalls and DHPC safety communications for specific products or therapeutic areas, and get an explicit `STATUS_CHANGE` event when an FDA recall flips from `Ongoing` to `Terminated` or an EMA `regulatory_outcome` updates, instead of re-reading the full feed to spot the difference yourself.
- **Pharmacy and hospital procurement risk screening** - before or during a purchasing decision, check whether a manufacturer or product category currently has an active FDA recall, filtered by severity (`Class I` = most severe) via the `fdaClassification` input, alongside any related EU safety communication.
- **Competitive and market intelligence** - watch a competitor's or category's recall and safety-alert activity across both US and EU jurisdictions in a single feed, segmented by the `jurisdiction` and `awarding_or_regulating_agency` fields on every record.

## Cost & BYOK Disclosure

This Actor bills on Apify's [Pay-Per-Event](https://apify.com/pricing) model - you pay only for records actually delivered, never for compute time, idle runtime, or per-minute usage.

| Event name | What triggers it | Price |
|---|---|---|
| `result` | One drug-safety record delivered to the dataset: an FDA `SANCTION` or EMA `NEW_LISTING` on first sighting, or a `STATUS_CHANGE`/`UPDATED` record on a repeat sighting whose status or other tracked fields changed | $0.001 per event |
| `apify-actor-start` | Apify's own synthetic per-run start event on every Pay-Per-Event Actor - charged automatically by the platform once per run (this Actor's code never calls it directly), covering the first 5 seconds of compute. Billed once per GB of memory allocated, minimum one charge; this Actor runs at 256-512MB, so it's always exactly one charge per run. | $0.00005 per run |

A default run (100 records per source, both regulators enabled = up to 200 records) costs roughly $0.20 ($0.001 x 200 results, plus the flat $0.00005 actor-start charge above). The `result` event is the only event this Actor's own code charges for; `apify-actor-start` is a platform-level charge applied uniformly to every PPE Actor on Apify, not something specific to this one.

**Unchanged records are not billed.** Every record gets a pair of SHA-1 fingerprints (`src/fingerprint.ts`) - one hashed over just its status field (FDA `status` or EMA `regulatory_outcome`), one over its other mutable fields. When `onlyNew: true`, any record whose fingerprint pair is identical to what was stored on the previous run (`SNAPSHOT_NO_DIFF`) is filtered out *before* `Actor.pushData()`/`Actor.charge()` ever runs (`src/main.ts`) - so an unchanged record costs $0.00. It is not charged and then refunded; it is never charged in the first place. With `onlyNew: false`, every fetched record is delivered and charged on every run regardless of whether it changed, which is why `onlyNew: true` is the recommended setting for recurring/scheduled monitoring.

**BYOK: none required.** This Actor needs no third-party API key to run. The optional `fdaApiKey` input exists solely to raise your own openFDA rate ceiling (240 req/min + 1,000 req/day without a key, vs. 120,000 req/day with a free one) - it is never required for normal use volumes, never pooled or stored beyond the run that used it, and if supplied is used only to authenticate your own requests directly to openFDA.

## Quickstart

Three equivalent ways to run this Actor and get its dataset items back. Get your API token from [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations).

### cURL (synchronous, no polling)

```bash
curl -X POST "https://api.apify.com/v2/acts/HJZvKxFUpZop6gIQ3/run-sync-get-dataset-items?token=<YOUR_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
  "maxItemsPerSource": 50,
  "onlyNew": true
}'
```

### Python (`apify-client`)

```python
# pip install apify-client
import os
from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run = client.actor("stefano_seggio/actor-22-drug-safety-recalls-monitor").call(
    run_input={
        "sources": ["fda", "ema"],
        "maxItemsPerSource": 50,
        "onlyNew": True,
        "dateRange": "7d",
        "fdaClassification": ["Class I", "Class II"],
    }
)

dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items

for item in dataset_items:
    print(
        f"[{item['jurisdiction']}] {item['event_type']} - "
        f"{item['recipient_or_defendant_name']} ({item['status_or_estado']})"
    )

print(f"\nTotal records: {len(dataset_items)}")
```

### Node.js (`apify-client`)

```javascript
// npm install apify-client
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const run = await client.actor('stefano_seggio/actor-22-drug-safety-recalls-monitor').call({
    sources: ['fda', 'ema'],
    maxItemsPerSource: 50,
    onlyNew: true,
    dateRange: '7d',
    fdaClassification: ['Class I', 'Class II'],
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();

for (const item of items) {
    console.log(`[${item.jurisdiction}] ${item.event_type} - ${item.recipient_or_defendant_name} (${item.status_or_estado})`);
}

console.log(`\nTotal records: ${items.length}`);
```

Full runnable copies of the Python and Node.js examples above also live in `examples/python_usage.py` and `examples/node-usage.js` in this repo.

## Use this from Claude Desktop, Cursor, or Windsurf (via MCP)

This Actor is also reachable through Apify's own hosted `@apify/actors-mcp-server` at `https://mcp.apify.com`, scoped to just this one Actor via a `?tools=stefano_seggio/actor-22-drug-safety-recalls-monitor` query string - your MCP client gets tool access to this Actor alone, not the rest of the fleet. Get your own token from [Apify Console → Settings → Integrations](https://console.apify.com/settings/integrations) first.

**Claude Desktop** (`claude_desktop_config.json`) - uses the `mcp-remote` stdio bridge, not a direct URL. Note: `mcp-remote` does not expand shell environment variables inside this JSON string, so paste your real token literally in place of `${APIFY_TOKEN}` below, and keep this file out of version control:

```json
{
  "mcpServers": {
    "delta-registry-actor-22-drug-safety-recalls-monitor": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.apify.com/?tools=stefano_seggio/actor-22-drug-safety-recalls-monitor",
        "--header",
        "Authorization: Bearer ${APIFY_TOKEN}"
      ]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` or `~/.cursor/mcp.json`) - native HTTP transport:

```json
{
  "mcpServers": {
    "delta-registry-actor-22-drug-safety-recalls-monitor": {
      "url": "https://mcp.apify.com/?tools=stefano_seggio/actor-22-drug-safety-recalls-monitor",
      "headers": {
        "Authorization": "Bearer ${APIFY_TOKEN}"
      }
    }
  }
}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`) - uses `serverUrl`, not `url`. Unlike Claude Desktop's `mcp-remote` bridge, Windsurf's `${env:...}` syntax genuinely resolves from your environment at runtime:

```json
{
  "mcpServers": {
    "delta-registry-actor-22-drug-safety-recalls-monitor": {
      "serverUrl": "https://mcp.apify.com/?tools=stefano_seggio/actor-22-drug-safety-recalls-monitor",
      "headers": {
        "Authorization": "Bearer ${env:APIFY_TOKEN}"
      }
    }
  }
}
```

Want every actor in the fleet available to one MCP client instead of just this one? See [`delta-registry-website/MCP_INTEGRATION.md`](https://github.com/stefanoseggio/delta-registry-website/blob/main/MCP_INTEGRATION.md) for the full 28-actor closed-scope config.

## Input & Output Schema

### Input

| Field | Type | Default | Description |
|---|---|---|---|
| `sources` | array | `["fda", "ema"]` | Which regulator(s) to query: `fda` (US openFDA drug enforcement/recall API) and/or `ema` (EU DHPC safety-alert JSON export). |
| `maxItemsPerSource` | integer | `100` | Hard cap on records returned per selected source this run, applied independently to FDA and EMA, both sorted newest-first. openFDA's own API caps a single request at 1,000 results; values above that are paginated automatically via `skip`. Range 1-5000. |
| `onlyNew` | boolean | `false` | Delta mode: only deliver records that are new, or whose status/other tracked fields changed, since the last run (persisted in this Actor's own named key-value store). |
| `dateRange` | string | - | `24h` / `7d` / `30d`, filtered on each source's own date field (FDA `report_date`; EMA `dissemination_date`). |
| `fdaClassification` | array | - | Restrict FDA results to one or more severity tiers (`Class I`, `Class II`, `Class III`; Class I = most severe). Ignored for EMA, which has no equivalent tiering in its DHPC feed. |
| `fdaApiKey` | string (secret) | - | Optional free openFDA key. Without a key, openFDA allows 240 requests/minute and 1,000 requests/day per IP; a free key raises the daily cap to 120,000. Not needed for normal use volumes. |

Example input:

```json
{
  "sources": ["fda", "ema"],
  "maxItemsPerSource": 100,
  "onlyNew": false,
  "dateRange": "30d"
}
```

### Output

One record per recall or safety alert, in a shared 18-field envelope plus source-specific native fields, with a mandatory disclaimer field on every record. You can download the dataset in JSON, HTML, CSV, or Excel format, or pull it via the Apify API.

#### Sample Extracted Dataset (JSON)

One real record from this Actor's own dataset, matching `.actor/dataset_schema.json`:

```json
{
  "recordSource": "fda_enforcement",
  "record_id": "fda:D-0769-2026",
  "event_type": "SANCTION",
  "scraped_at": "2026-09-08T14:00:00.000Z",
  "is_new": true,
  "source_url": "https://api.fda.gov/drug/enforcement.json?search=recall_number:%22D-0769-2026%22",
  "category_or_type": "Drugs",
  "status_or_estado": "Ongoing",
  "awarding_or_regulating_agency": "U.S. Food and Drug Administration (FDA)",
  "classification": "Class I",
  "productDescription": "Kian Pee Wan Capsules, 30-count bottles",
  "reasonForRecall": "Marketed Without an Approved NDA/ANDA"
}
```

#### Field reference

| Field | Description |
|---|---|
| `recordSource` | `fda_enforcement` or `ema_dhpc` - which feed produced this record. |
| `record_id` | Stable, source-prefixed id: `fda:<recall_number>` or `ema:<slug>:<dissemination_date>`. |
| `event_type` | First seen: `SANCTION` (FDA) or `NEW_LISTING` (EMA). Repeat sighting: `STATUS_CHANGE`, `UPDATED`, or `SNAPSHOT_NO_DIFF`. |
| `scraped_at` | ISO-8601 timestamp of this run. |
| `is_new` | `true` if this is the first time this `record_id` has been seen. |
| `source_url` | Direct link back to the regulator's own API query or record for this item. |
| `recipient_or_defendant_name` | Firm/manufacturer name (FDA) or equivalent named party. |
| `entity_identifier_native` | Source-native secondary identifier: FDA `event_id`, or EMA `atc_code_human` (ATC classification code). Real per-record data, mirrored for convenience on the FDA-only `eventId` / EMA-only `atcCodeHuman` fields below. |
| `effective_date_iso` | Normalized ISO date the recall/alert took effect: FDA `recall_initiation_date`, EMA `dissemination_date`. Real per-record data, not always-null. |
| `publish_date_iso` | Normalized ISO date the record was first published: FDA `report_date`, EMA `first_published_date`. Real per-record data, not always-null. |
| `category_or_type` | Always `"Drugs"` for this Actor's scope. |
| `status_or_estado` | FDA `status` (`Ongoing`/`Terminated`/`Completed`) or EMA `regulatory_outcome`. |
| `awarding_or_regulating_agency` | The regulator that issued the recall or alert (e.g. FDA, EMA). |
| `jurisdiction` | `US` or `EU`. |
| `reference_number` | The regulator's own reference/recall number. |
| `regulatoryDataDisclaimer` | Mandatory on every record - see Reliability below. |
| `value_native`, `value_currency`, `value_usd_normalized`, `source_document_url` | Part of the shared 18-field envelope used fleet-wide (e.g. for monetary contract-value actors), but always `null` on this Actor's records - drug recalls and safety alerts carry no monetary value, and neither source exposes a document endpoint distinct from `source_url`. |
| *(FDA-only)* | `classification`, `productDescription`, `reasonForRecall`, `recallingFirm`, `distributionPattern`, `voluntaryMandated`, `recallNumber`, `eventId`, `city`, `state`, `country` - null on EMA records. |
| *(EMA-only)* | `nameOfMedicine`, `activeSubstances`, `dhpcType`, `atcCodeHuman`, `therapeuticAreaMesh`, `procedureNumber`, `regulatoryOutcome` - null on FDA records. |

## Reliability & Known Limitations

**Change detection, not a flat seen-list.** Every record gets a pair of content fingerprints: one hashed over just its status field (FDA `status` or EMA `regulatory_outcome`), one over its other mutable fields. On a repeat sighting, comparing the current pair against the stored pair produces `STATUS_CHANGE` (status differs), `UPDATED` (other tracked fields differ), or `SNAPSHOT_NO_DIFF` (identical) - so a recall flipping from `Ongoing` to `Terminated` is surfaced even though the record itself "was seen before."

**State that actually persists.** Fingerprints are stored in this Actor's own named key-value store (not the run-scoped default store), so they survive between separate scheduled runs rather than resetting every time. State is capped at 5,000 entries per source, evicting the least-recently-seen entries first. If a run ever encounters an unrecognized or older state shape, it treats it as absent and re-baselines cleanly rather than attempting a risky migration.

**Retry logic tuned for these two APIs.** HTTP 429 (rate-limited) and 5xx responses are retried with exponential backoff plus jitter; a `Retry-After` header, when either regulator sends one, is honored as the authoritative delay. Other 4xx responses (400, 404, etc.) are treated as permanent client errors and are not retried.

**No fabricated "closed" event.** Neither regulator is known to remove a historical record once published - a `Terminated` FDA recall stays queryable, and EMA DHPCs are permanent regulator communications - and this Actor fetches a bounded, newest-first window per run rather than exhaustively walking each source's full register. So it never reports a record as removed or closed; it only reports what it can actually verify (new, changed, or unchanged).

## Contributing & Local Setup

This repository ships the Actor's real, buildable TypeScript source (`src/`, `.actor/`, `test/`) - it is not a documentation-only wrapper, so local development and testing against the real FDA/EMA APIs works as expected:

```bash
git clone https://github.com/stefanoseggio/actor-22-drug-safety-recalls-monitor.git
cd actor-22-drug-safety-recalls-monitor
npm install
apify login          # paste your token from console.apify.com/settings/integrations
npm run start:dev    # runs src/main.ts directly via tsx, against the live FDA/EMA APIs
```

Other useful scripts, from `package.json`: `npm run build` (compiles with `tsc`), `npm test` (runs the Vitest suite against the live-captured fixtures in `test/fixtures/`), `npm run lint` / `npm run format`.

Found a bug, or want a new source, filter field, or jurisdiction covered (e.g. a third regulator)? Open an issue or pull request on this repository, or use the Apify Store's own Issues tab on the [Store listing](https://apify.com/stefano_seggio/actor-22-drug-safety-recalls-monitor) if you'd rather not use GitHub.

## Support & Enterprise SLA

This is an independent developer-run Actor, not a vendor-backed enterprise product - there is no contractual SLA, and none is claimed here. Issues, bugs, or source-coverage requests (e.g. a regulator not yet covered) can be filed via the Apify Store's Issues tab; typical response time is within about 48 hours.

The mandatory `regulatoryDataDisclaimer` field on every record is a data-integrity feature, not a legal disclaimer bolted on to limit liability: both the FDA and EMA feeds this Actor reads are genuinely open, unauthenticated, publisher-sanctioned sources, and the disclaimer exists so downstream consumers always know, on a per-record basis, that what they're looking at is unverified regulator data - not medical advice, and not independently confirmed by this Actor - before they act on it.

---

This Actor is part of **Delta Registry** - pay-per-event regulatory & compliance data infrastructure built and operated by Stefano Seggio. For professional inquiries or enterprise licensing, connect on [LinkedIn](https://www.linkedin.com/in/stefanoseggio-deltaregistry); for the rest of the fleet, see [github.com/stefanoseggio](https://github.com/stefanoseggio).
