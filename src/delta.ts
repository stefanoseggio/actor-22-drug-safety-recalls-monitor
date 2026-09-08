import type { RecordFingerprint } from './fingerprint.js';

/**
 * This actor's real event-type vocabulary. No CLOSED: neither source is
 * confirmed (by live verification, the same bar every other claim in this
 * repo is held to) to ever remove a historical record - openFDA is a
 * permanent enforcement database (a Terminated recall stays queryable, it
 * doesn't disappear) and EMA DHPCs are permanent regulator communications,
 * not listings that get taken down. Even setting that aside, this actor
 * fetches a bounded, newest-first top-N window per source
 * (maxItemsPerSource, default 100) rather than walking either source's
 * entire historical register each run - a trustworthy CLOSED/complete-census
 * check (the isUnfilteredInput()/truncatedByMaxItems pattern used elsewhere
 * in this fleet) fundamentally requires exhaustively walking the register,
 * which this actor's bounded recency-window design does not do and is not
 * meant to do. First-seen event names deliberately differ per source,
 * preserving this actor's own pre-existing distinction (see
 * umsNormalizer.ts): an FDA enforcement action is a real regulatory
 * SANCTION against a firm; an EMA DHPC is a newly published communication,
 * not itself an enforcement action, so NEW_LISTING fits it better.
 */
export type FdaEventType = 'SANCTION' | 'STATUS_CHANGE' | 'UPDATED' | 'SNAPSHOT_NO_DIFF';
export type EmaEventType = 'NEW_LISTING' | 'STATUS_CHANGE' | 'UPDATED' | 'SNAPSHOT_NO_DIFF';

function classify<T extends string>(newEventType: T, previous: RecordFingerprint | undefined, current: RecordFingerprint): T | 'STATUS_CHANGE' | 'UPDATED' | 'SNAPSHOT_NO_DIFF' {
    if (!previous) return newEventType;
    if (previous.statusFingerprint !== current.statusFingerprint) return 'STATUS_CHANGE';
    if (previous.contentFingerprint !== current.contentFingerprint) return 'UPDATED';
    return 'SNAPSHOT_NO_DIFF';
}

export function classifyFdaRecord(previous: RecordFingerprint | undefined, current: RecordFingerprint): FdaEventType {
    return classify('SANCTION', previous, current);
}

export function classifyEmaRecord(previous: RecordFingerprint | undefined, current: RecordFingerprint): EmaEventType {
    return classify('NEW_LISTING', previous, current);
}
