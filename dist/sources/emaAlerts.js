import { isWithinDateRange, parseEuDateToIso } from '../dateUtils.js';
import { fetchJsonWithRetry } from '../http.js';
/**
 * EMA does not run a general safety-alert REST API; this JSON export is the
 * genuinely structured, open source verified live for this actor (see the
 * verified-target comment block in ../http.ts for the full verification
 * record: robots.txt explicitly allows this path, no CAPTCHA/WAF, updated
 * twice daily). Referrals (referrals-output-json-report_en.json) was also
 * confirmed live and structurally identical in shape, but DHPCs are the
 * closer analog to an FDA-style safety alert/recall communication and are
 * the one implemented here; the referrals feed is a documented extension
 * point, not a silent gap.
 */
const EMA_DHPC_JSON_URL = 'https://www.ema.europa.eu/en/documents/report/dhpc-output-json-report_en.json';
/** EMA's JSON export is a full snapshot per fetch (no server-side pagination or date filtering) - sort/filter/cap client-side after one download. */
function sortNewestFirst(records) {
    return [...records].sort((a, b) => {
        const aIso = parseEuDateToIso(a.dissemination_date) ?? parseEuDateToIso(a.first_published_date);
        const bIso = parseEuDateToIso(b.dissemination_date) ?? parseEuDateToIso(b.first_published_date);
        return (bIso ? Date.parse(bIso) : 0) - (aIso ? Date.parse(aIso) : 0);
    });
}
export async function fetchEmaDhpcRecords(options) {
    const { maxItems, dateRange, now } = options;
    const response = await fetchJsonWithRetry(EMA_DHPC_JSON_URL);
    let records = sortNewestFirst(response.data ?? []);
    if (dateRange) {
        records = records.filter((record) => {
            const iso = parseEuDateToIso(record.dissemination_date) ?? parseEuDateToIso(record.first_published_date);
            return isWithinDateRange(iso, dateRange, now);
        });
    }
    return records.slice(0, maxItems);
}
//# sourceMappingURL=emaAlerts.js.map