import type { DateRangePreset } from './schemas.js';
/** FDA date fields (report_date, recall_initiation_date, ...) are rendered as bare YYYYMMDD strings - verified live against test/fixtures/fda_enforcement_sample.json. */
export declare function parseFdaDateToIso(value: string | null | undefined): string | null;
/** EMA date fields (dissemination_date, first_published_date, ...) are rendered as DD/MM/YYYY - verified live against test/fixtures/ema_dhpc_sample.json. */
export declare function parseEuDateToIso(value: string | null | undefined): string | null;
/** Converts a Date to openFDA's bare YYYYMMDD search-syntax format. */
export declare function toFdaDateStamp(date: Date): string;
/** [from, to] bounds in openFDA YYYYMMDD format for a DateRangePreset window ending at `now`. */
export declare function fdaDateRangeWindow(preset: DateRangePreset | undefined, now: Date): {
    from: string;
    to: string;
} | null;
/**
 * True if an ISO instant falls within `preset` of `now`. Used for EMA, which
 * has no server-side date-range query param in its JSON export.
 *
 * Requires `diffMs >= 0`, not just `diffMs <= window` - a naive one-sided
 * check lets any future-dated record match every window (a negative diff is
 * always <= a positive window bound). EMA `dissemination_date` is always a
 * past publication date in practice (this is a record of a communication
 * that already went out, not a scheduled future one), so this guard is
 * defensive rather than fixing a live-observed bug - but it's the exact same
 * bug class that DID fire live on this fleet's mendoza-compras-monitor
 * (upcoming bid-opening dates) and pba-tenders-monitor (upcoming
 * fechaApertura), so it's fixed here proactively rather than left for a
 * future data shape (e.g. a "communication scheduled for next week") to
 * trigger it silently.
 */
export declare function isWithinDateRange(isoDate: string | null, preset: DateRangePreset | undefined, now: Date): boolean;
//# sourceMappingURL=dateUtils.d.ts.map