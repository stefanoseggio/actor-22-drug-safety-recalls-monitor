# Regulatory Medical Recalls & Drug Safety Monitor

Combines the **FDA's openFDA drug enforcement (recall) API** and the **EMA's Direct Healthcare Professional Communications (DHPC)** safety-alert feed into one normalized stream - US and EU drug safety data, one schema, one Actor. Every record carries a mandatory, runtime-enforced regulatory-data disclaimer. Try it with the default input (both regulators, 100 records each) and see real, live recall and safety-alert data in seconds.

## Why use this Actor?

- **Two regulators, one schema.** FDA recalls and EMA safety communications use completely different native field names and structures - this Actor normalizes both into the same 18-field Unified Master Schema so you can query, filter, and pipe them into the same downstream system without writing two integrations.
- **Change detection, not just extraction.** Run it on a schedule with `onlyNew: true` and get notified when a recall's status changes (e.g. FDA `Ongoing` -> `Terminated`) or an EMA safety outcome updates - not just when a brand-new record appears.
- **Compliance and pharmacovigilance teams**: track recalls/alerts for products or therapeutic areas you monitor, filtered by FDA severity classification.
- **Market/competitive intelligence**: watch a competitor's or category's recall activity across both US and EU jurisdictions in one feed.
- **Data teams building a compliance dashboard or alerting pipeline**: get clean, typed, disclaimer-tagged JSON instead of screen-scraping two different regulator websites.

## How to use it

1. Open the Actor's Input tab (or use the JSON example below).
2. Pick `sources` (FDA, EMA, or both - default both), a `maxItemsPerSource` cap, and optionally a `dateRange` window or FDA severity filter.
3. For recurring monitoring, enable `onlyNew` so repeat runs only deliver what's new or changed since last time.
4. Run it. Results land in the dataset - export as JSON, CSV, Excel, or pull via the API.

```json
{
  "sources": ["fda", "ema"],
  "maxItemsPerSource": 100,
  "onlyNew": false,
  "dateRange": "30d"
}
```

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `sources` | array | `["fda", "ema"]` | Which regulator(s) to query. |
| `maxItemsPerSource` | integer | `100` | Hard cap per source, newest-first. openFDA auto-paginates past its own 1,000/request cap when this is higher. |
| `onlyNew` | boolean | `false` | Delta mode: only deliver records that are new, or whose status/content changed, since the last run (persisted in this Actor's own key-value store). |
| `dateRange` | string | - | `24h` / `7d` / `30d`, filtered on each source's own date field. |
| `fdaClassification` | array | - | Restrict FDA results to one or more severity tiers (Class I = most severe). Ignored for EMA. |
| `fdaApiKey` | string | - | Optional free openFDA key - raises the daily request cap from 1,000 to 120,000. Not needed for normal use. |

## Output

One record per recall/alert, in the shared 18-field envelope plus source-specific native fields:

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
  "regulatoryDataDisclaimer": "This record is sourced directly from the named regulator's own public enforcement/safety-communication feed..."
}
```

You can download the dataset in various formats such as JSON, HTML, CSV, or Excel.

### Field reference

| Field | Description |
|---|---|
| `event_type` | First seen: `SANCTION` (FDA) / `NEW_LISTING` (EMA). Repeat sighting: `STATUS_CHANGE`, `UPDATED`, or `SNAPSHOT_NO_DIFF`. See "Delta mode" below. |
| `status_or_estado` | FDA `status` (Ongoing/Terminated/Completed) or EMA `regulatory_outcome`. |
| `jurisdiction` | `US` or `EU`. |
| `regulatoryDataDisclaimer` | Mandatory on every record - see "Compliance" below. |
| *(FDA-only)* `classification`, `recallingFirm`, `distributionPattern`, `reasonForRecall`, `city`/`state`/`country` | Native FDA fields, null on EMA records. |
| *(EMA-only)* `nameOfMedicine`, `activeSubstances`, `dhpcType`, `atcCodeHuman`, `therapeuticAreaMesh` | Native EMA fields, null on FDA records. |

## Delta mode - change detection across runs

Enable `onlyNew: true` on a scheduled task and this Actor persists a content fingerprint per record (in its own named key-value store, so it survives between runs) and only delivers what's actually new or different:

- **`SANCTION` / `NEW_LISTING`** - first time this exact record has been seen.
- **`STATUS_CHANGE`** - the record's status changed since last time (FDA `Ongoing` -> `Terminated`, or an EMA `regulatory_outcome` update).
- **`UPDATED`** - some other field changed (e.g. a corrected recall description) but status didn't.
- **`SNAPSHOT_NO_DIFF`** - identical to last time; skipped from delivery when `onlyNew` is on.

There's no "closed/removed" event: neither regulator is known to remove a historical record from its feed once published, so this Actor never claims to know something disappeared.

## Pricing

Pay-per-event: **$0.001 per delivered record**, plus a small one-time actor-start charge. A default 100-per-source run (200 records) costs about $0.20. No idle-server or per-minute charges.

## Compliance and data provenance

Both sources are genuinely open, unauthenticated, publisher-sanctioned feeds - no CAPTCHA-solving, no login-wall bypass, no WAF evasion anywhere in this Actor. FDA openFDA's own terms explicitly invite this kind of public use; EMA's `robots.txt` explicitly allows the DHPC export path used here. Every record carries a mandatory `regulatoryDataDisclaimer` field - this data is sourced directly from each regulator's own public feed, has not been independently medically verified by this Actor, and is not intended as clinical or consumer medical advice.

## Known limitations

- EMA's JSON export is a full snapshot per fetch (no server-side date filtering) - `dateRange` is applied client-side after download, which is accurate but means the EMA request itself is always a full download regardless of the window chosen.
- No `CLOSED`/removal event - see "Delta mode" above for why.
- FDA classification filtering only applies to FDA results; EMA has no equivalent severity tiering in its DHPC feed.

Questions or a source-coverage request (e.g. a specific regulator not yet covered)? Use the Issues tab - custom extensions are available.
