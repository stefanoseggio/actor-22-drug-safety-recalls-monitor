# Drug Safety & Recall Monitor - FDA & EMA Regulatory Alerts (Global Pharma Compliance)

[![Built for Apify](https://img.shields.io/badge/Built%20for-Apify-24A6E9?style=flat-square&logo=apify&logoColor=white)](https://apify.com)
[![Pay-Per-Event](https://img.shields.io/badge/Pay--Per--Event-%240.001%2Fevent-4CAF50?style=flat-square)](https://apify.com/stefano_seggio/actor-22-drug-safety-recalls-monitor)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Apache 2.0 License](https://img.shields.io/badge/License-Apache%202.0-D22128?style=flat-square)](./LICENSE)

[![Run this Actor on Apify](https://apify.com/img/run-on-apify.svg)](https://apify.com/stefano_seggio/actor-22-drug-safety-recalls-monitor)

## Executive Value Proposition

Checking FDA's openFDA drug enforcement database and EMA's Direct Healthcare Professional Communications (DHPC) feed separately means learning two different field structures, two different pagination behaviors, and manually diffing results run-over-run just to notice that a recall's status changed. This Actor normalizes both into one 18-field schema, tagged by jurisdiction and regulating agency and sorted newest-first, and can be scheduled to surface only what's new or changed since the last run instead of the full list every time. What would otherwise be two separate manual feed checks - and a spreadsheet to track what you've already seen - becomes one scheduled Actor run with structured, exportable output and a dedicated "Change detection" dataset view for what's new or different since last time.

## Who uses this

- **Pharmacovigilance and drug-safety teams** - track recalls and DHPC safety communications for specific products or therapeutic areas, and get an explicit `STATUS_CHANGE` event when an FDA recall flips from `Ongoing` to `Terminated` or an EMA `regulatory_outcome` updates, instead of re-reading the full feed to spot the difference yourself.
- **Pharmacy and hospital procurement risk screening** - before or during a purchasing decision, check whether a manufacturer or product category currently has an active FDA recall, filtered by severity (`Class I` = most severe) via the `fdaClassification` input, alongside any related EU safety communication.
- **Competitive and market intelligence** - watch a competitor's or category's recall and safety-alert activity across both US and EU jurisdictions in a single feed, segmented by the `jurisdiction` and `awarding_or_regulating_agency` fields on every record.

## Quick start

Run it straight from the Apify CLI - no code required (a Console "Run" click works the same way):

```bash
apify call actor-22-drug-safety-recalls-monitor --input '{
  "sources": ["fda", "ema"],
  "maxItemsPerSource": 50,
  "onlyNew": true,
  "dateRange": "7d",
  "fdaClassification": ["Class I", "Class II"]
}'
```

This pulls up to 50 newest records per regulator published in the last 7 days, restricted to FDA Class I/II severity, and (with `onlyNew: true`) delivers only records that are new or have changed since the previous run. Results land in the run's default dataset - see [Output](#output) below for the record shape. Full runnable Node.js and Python examples (using the `apify-client` package) are in `examples/node-usage.js` and `examples/python_usage.py` in this repo.

## Input

```json
{
  "sources": ["fda", "ema"],
  "maxItemsPerSource": 100,
  "onlyNew": false,
  "dateRange": "30d"
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `sources` | array | `["fda", "ema"]` | Which regulator(s) to query: `fda` (US openFDA drug enforcement/recall API) and/or `ema` (EU DHPC safety-alert JSON export). |
| `maxItemsPerSource` | integer | `100` | Hard cap on records returned per selected source this run, applied independently to FDA and EMA, both sorted newest-first. openFDA's own API caps a single request at 1,000 results; values above that are paginated automatically via `skip`. Range 1-5000. |
| `onlyNew` | boolean | `false` | Delta mode: only deliver records that are new, or whose status/other tracked fields changed, since the last run (persisted in this Actor's own named key-value store). |
| `dateRange` | string | - | `24h` / `7d` / `30d`, filtered on each source's own date field (FDA `report_date`; EMA `dissemination_date`). |
| `fdaClassification` | array | - | Restrict FDA results to one or more severity tiers (`Class I`, `Class II`, `Class III`; Class I = most severe). Ignored for EMA, which has no equivalent tiering in its DHPC feed. |
| `fdaApiKey` | string | - | Optional free openFDA key (secret field). Without a key, openFDA allows 240 requests/minute and 1,000 requests/day per IP; a free key raises the daily cap to 120,000. Not needed for normal use volumes. |

## Output

One record per recall or safety alert, in a shared 18-field envelope plus source-specific native fields, with a mandatory disclaimer field on every record:

```json
{
  "recordSource": "fda_enforcement",
  "record_id": "fda:D-0769-2026",
  "event_type": "SANCTION",
  "scraped_at": "2026-09-08T14:00:00.000Z",
  "is_new": true,
  "source_url": "https://api.fda.gov/drug/enforcement.json?search=recall_number:%22D-0769-2026%22",
  "recipient_or_defendant_name": "Buy-Herbal",
  "category_or_type": "Drugs",
  "status_or_estado": "Ongoing",
  "awarding_or_regulating_agency": "U.S. Food and Drug Administration (FDA)",
  "jurisdiction": "US",
  "reference_number": "D-0769-2026",
  "classification": "Class I",
  "productDescription": "Kian Pee Wan Capsules, 30-count bottles",
  "reasonForRecall": "Marketed Without an Approved NDA/ANDA",
  "regulatoryDataDisclaimer": "This record is sourced directly from the named regulator's own public enforcement/safety-communication feed (US FDA openFDA drug enforcement API, or EU EMA Direct Healthcare Professional Communications). It has not been independently medically verified by this actor, may not reflect the regulator's current live status, and is not intended as clinical or consumer medical advice. Consult the source regulator and a qualified healthcare professional before making any medical or clinical decision."
}
```

You can download the dataset in JSON, HTML, CSV, or Excel format, or pull it via the Apify API.

### Field reference

| Field | Description |
|---|---|
| `recordSource` | `fda_enforcement` or `ema_dhpc` - which feed produced this record. |
| `record_id` | Stable, source-prefixed id: `fda:<recall_number>` or `ema:<slug>:<dissemination_date>`. |
| `event_type` | First seen: `SANCTION` (FDA) or `NEW_LISTING` (EMA). Repeat sighting: `STATUS_CHANGE`, `UPDATED`, or `SNAPSHOT_NO_DIFF`. |
| `status_or_estado` | FDA `status` (`Ongoing`/`Terminated`/`Completed`) or EMA `regulatory_outcome`. |
| `jurisdiction` | `US` or `EU`. |
| `awarding_or_regulating_agency` | The regulator that issued the recall or alert (e.g. FDA, EMA). |
| `regulatoryDataDisclaimer` | Mandatory on every record - see Reliability below. |
| *(FDA-only)* | `classification`, `productDescription`, `reasonForRecall`, `recallingFirm`, `distributionPattern`, `voluntaryMandated`, `recallNumber`, `eventId`, `city`, `state`, `country` - null on EMA records. |
| *(EMA-only)* | `nameOfMedicine`, `activeSubstances`, `dhpcType`, `atcCodeHuman`, `therapeuticAreaMesh`, `procedureNumber`, `regulatoryOutcome` - null on FDA records. |

## Reliability

**Change detection, not a flat seen-list.** Every record gets a pair of content fingerprints: one hashed over just its status field (FDA `status` or EMA `regulatory_outcome`), one over its other mutable fields. On a repeat sighting, comparing the current pair against the stored pair produces `STATUS_CHANGE` (status differs), `UPDATED` (other tracked fields differ), or `SNAPSHOT_NO_DIFF` (identical) - so a recall flipping from `Ongoing` to `Terminated` is surfaced even though the record itself "was seen before."

**State that actually persists.** Fingerprints are stored in this Actor's own named key-value store (not the run-scoped default store), so they survive between separate scheduled runs rather than resetting every time. State is capped at 5,000 entries per source, evicting the least-recently-seen entries first. If a run ever encounters an unrecognized or older state shape, it treats it as absent and re-baselines cleanly rather than attempting a risky migration.

**Retry logic tuned for these two APIs.** HTTP 429 (rate-limited) and 5xx responses are retried with exponential backoff plus jitter; a `Retry-After` header, when either regulator sends one, is honored as the authoritative delay. Other 4xx responses (400, 404, etc.) are treated as permanent client errors and are not retried.

**No fabricated "closed" event.** Neither regulator is known to remove a historical record once published - a `Terminated` FDA recall stays queryable, and EMA DHPCs are permanent regulator communications - and this Actor fetches a bounded, newest-first window per run rather than exhaustively walking each source's full register. So it never reports a record as removed or closed; it only reports what it can actually verify (new, changed, or unchanged).

## Instant Terminal Run (cURL)

Runs synchronously and returns the resulting dataset items directly in the response - no polling needed. Get your token from [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations).

```bash
curl -X POST "https://api.apify.com/v2/acts/HJZvKxFUpZop6gIQ3/run-sync-get-dataset-items?token=<YOUR_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
  "maxItemsPerSource": 50,
  "onlyNew": true
}'
```

## Sample Extracted Dataset (JSON)

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

## Pricing (Pay-Per-Event)

This Actor bills on Apify's [Pay-Per-Event](https://apify.com/pricing) model - you pay only for records actually delivered, never for compute time, idle runtime, or per-minute usage.

| Event name | Event title | Price |
|---|---|---|
| `result` | Drug Safety Recall/Alert Record | $0.001 per event |

A default run (100 records per source, both regulators enabled = up to 200 records) costs roughly $0.20. The `result` event above is the only billed event - there is no separate platform or Actor-start fee.

## Support & Enterprise SLA

This is an independent developer-run Actor, not a vendor-backed enterprise product - there is no contractual SLA, and none is claimed here. Issues, bugs, or source-coverage requests (e.g. a regulator not yet covered) can be filed via the Apify Store's Issues tab; typical response time is within about 48 hours.

The mandatory `regulatoryDataDisclaimer` field on every record is a data-integrity feature, not a legal disclaimer bolted on to limit liability: both the FDA and EMA feeds this Actor reads are genuinely open, unauthenticated, publisher-sanctioned sources, and the disclaimer exists so downstream consumers always know, on a per-record basis, that what they're looking at is unverified regulator data - not medical advice, and not independently confirmed by this Actor - before they act on it.

---

This Actor is part of **Delta Registry** - pay-per-event regulatory & compliance data infrastructure built and operated by Stefano Seggio. For professional inquiries or enterprise licensing, connect on [LinkedIn](https://www.linkedin.com/in/stefanoseggio-deltaregistry); for the rest of the fleet, see [github.com/stefanoseggio](https://github.com/stefanoseggio).
