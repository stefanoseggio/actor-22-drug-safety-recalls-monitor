import type { RecordFingerprint } from './fingerprint.js';
export interface RecordEntry extends RecordFingerprint {
    lastSeenAt: string;
}
export interface DeltaState {
    /** source -> recordId -> entry. v2 shape: a per-record fingerprint pair, not a flat seen-id array - this is what makes STATUS_CHANGE/UPDATED classification possible, not just is_new. */
    entries: Record<string, Record<string, RecordEntry>>;
    lastRunAt: Record<string, string>;
}
export declare function createEmptyState(): DeltaState;
export declare function loadState(): Promise<DeltaState>;
/**
 * Persists every record entry actually FETCHED this run for `source`
 * (regardless of whether the onlyNew filter chose to deliver it) - this
 * actor's fetch is always a bounded, newest-first top-N window (never an
 * early-stopped/budget-truncated walk), so "fetched this run" and "should be
 * recorded as seen" are the same set here, unlike the registry-monitoring
 * actors elsewhere in this fleet where a maxItems-truncated walk means only
 * SOME of what exists was actually visited.
 */
export declare function saveSourceState(state: DeltaState, source: string, entriesSeenThisRun: Record<string, RecordEntry>, runAt: string): Promise<DeltaState>;
//# sourceMappingURL=state.d.ts.map