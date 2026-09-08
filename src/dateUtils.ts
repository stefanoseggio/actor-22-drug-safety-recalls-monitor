import type { DateRangePreset } from './schemas.js';

const WINDOW_MS: Record<DateRangePreset, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

/** FDA date fields (report_date, recall_initiation_date, ...) are rendered as bare YYYYMMDD strings - verified live against test/fixtures/fda_enforcement_sample.json. */
export function parseFdaDateToIso(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!match) return null;
    const [, yyyy, mm, dd] = match;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString();
}

/** EMA date fields (dissemination_date, first_published_date, ...) are rendered as DD/MM/YYYY - verified live against test/fixtures/ema_dhpc_sample.json. */
export function parseEuDateToIso(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString();
}

/** Converts a Date to openFDA's bare YYYYMMDD search-syntax format. */
export function toFdaDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/** [from, to] bounds in openFDA YYYYMMDD format for a DateRangePreset window ending at `now`. */
export function fdaDateRangeWindow(preset: DateRangePreset | undefined, now: Date): { from: string; to: string } | null {
    if (!preset) return null;
    const fromDate = new Date(now.getTime() - WINDOW_MS[preset]);
    return { from: toFdaDateStamp(fromDate), to: toFdaDateStamp(now) };
}

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
export function isWithinDateRange(isoDate: string | null, preset: DateRangePreset | undefined, now: Date): boolean {
    if (!preset) return true;
    if (!isoDate) return false;
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return false;
    const diffMs = now.getTime() - date.getTime();
    return diffMs >= 0 && diffMs <= WINDOW_MS[preset];
}
