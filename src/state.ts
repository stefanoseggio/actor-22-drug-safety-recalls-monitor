import { Actor } from 'apify';

import type { RecordFingerprint } from './fingerprint.js';

// A NAMED key-value store (not the run's default one, which is isolated per
// run - Actor.getValue()/Actor.setValue() would resolve to that isolated
// store and never persist across separate runs, confirmed against
// node_modules/apify/dist/actor.d.ts and the real bug this caused on this
// fleet's primer-actor) persists across scheduled runs of this actor. Keyed
// per source since FDA recall_numbers and EMA dhpc slugs are independent id
// spaces.
const STATE_STORE_NAME = 'actor-22-drug-safety-recalls-monitor-delta-state';
const MAX_ENTRIES_PER_SOURCE = 5000;

export interface RecordEntry extends RecordFingerprint {
    lastSeenAt: string;
}

export interface DeltaState {
    /** source -> recordId -> entry. v2 shape: a per-record fingerprint pair, not a flat seen-id array - this is what makes STATUS_CHANGE/UPDATED classification possible, not just is_new. */
    entries: Record<string, Record<string, RecordEntry>>;
    lastRunAt: Record<string, string>;
}

// v1 of this actor stored { seenIds: Record<string, string[]>, lastRunAt }.
// isValidState() treats that shape (and anything else that isn't a real v2
// DeltaState) as absent rather than attempting a migration - an existing
// scheduled task's next run simply re-baselines (every record it fetches
// gets classified against no prior fingerprint, since none exists yet).
function isValidState(value: unknown): value is DeltaState {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.entries !== 'object' || candidate.entries === null) return false;
    if (typeof candidate.lastRunAt !== 'object' || candidate.lastRunAt === null) return false;
    return true;
}

export function createEmptyState(): DeltaState {
    return { entries: {}, lastRunAt: {} };
}

export async function loadState(): Promise<DeltaState> {
    const store = await Actor.openKeyValueStore(STATE_STORE_NAME);
    const state = await store.getValue<DeltaState>('state');
    return isValidState(state) ? state : createEmptyState();
}

/**
 * Persists every record entry actually FETCHED this run for `source`
 * (regardless of whether the onlyNew filter chose to deliver it) - this
 * actor's fetch is always a bounded, newest-first top-N window (never an
 * early-stopped/budget-truncated walk), so "fetched this run" and "should be
 * recorded as seen" are the same set here, unlike the registry-monitoring
 * actors elsewhere in this fleet where a maxItems-truncated walk means only
 * SOME of what exists was actually visited.
 */
export async function saveSourceState(
    state: DeltaState,
    source: string,
    entriesSeenThisRun: Record<string, RecordEntry>,
    runAt: string,
): Promise<DeltaState> {
    const previous = state.entries[source] ?? {};
    const merged = { ...previous, ...entriesSeenThisRun };

    let capped = merged;
    const keys = Object.keys(merged);
    if (keys.length > MAX_ENTRIES_PER_SOURCE) {
        const keptKeys = keys.sort((a, b) => merged[b].lastSeenAt.localeCompare(merged[a].lastSeenAt)).slice(0, MAX_ENTRIES_PER_SOURCE);
        capped = Object.fromEntries(keptKeys.map((k) => [k, merged[k]]));
    }

    const next: DeltaState = {
        entries: { ...state.entries, [source]: capped },
        lastRunAt: { ...state.lastRunAt, [source]: runAt },
    };
    const store = await Actor.openKeyValueStore(STATE_STORE_NAME);
    await store.setValue('state', next);
    return next;
}
