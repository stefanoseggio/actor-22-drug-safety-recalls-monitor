import { Actor } from 'apify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createEmptyState, loadState, saveSourceState } from '../src/state.js';
import type { RecordEntry } from '../src/state.js';

describe('state persistence', () => {
    beforeAll(async () => {
        await Actor.init();
    });

    afterAll(async () => {
        await Actor.exit({ exit: false });
    });

    it('returns an empty state when nothing has been saved yet', async () => {
        const state = await loadState();
        expect(state.entries).toEqual({});
        expect(state.lastRunAt).toEqual({});
    });

    it('round-trips a saved per-source state', async () => {
        const entry: RecordEntry = { statusFingerprint: 'sh1', contentFingerprint: 'ch1', lastSeenAt: '2026-09-08T00:00:00.000Z' };
        const state = await saveSourceState(createEmptyState(), 'fda', { 'fda:D-0001-2026': entry }, '2026-09-08T00:00:00.000Z');
        expect(state.entries.fda['fda:D-0001-2026']).toEqual(entry);

        const loaded = await loadState();
        expect(loaded.entries.fda['fda:D-0001-2026']).toEqual(entry);
        expect(loaded.lastRunAt.fda).toBe('2026-09-08T00:00:00.000Z');
    });

    it('merges a second source without touching the first', async () => {
        const emaEntry: RecordEntry = { statusFingerprint: 'sh2', contentFingerprint: 'ch2', lastSeenAt: '2026-09-08T01:00:00.000Z' };
        const state = await saveSourceState(await loadState(), 'ema', { 'ema:some-dhpc:01/09/2026': emaEntry }, '2026-09-08T01:00:00.000Z');
        expect(state.entries.fda['fda:D-0001-2026']).toBeDefined();
        expect(state.entries.ema['ema:some-dhpc:01/09/2026']).toEqual(emaEntry);
    });

    it('treats a v1-shaped legacy value ({ seenIds, lastRunAt }) as absent rather than throwing', async () => {
        const store = await Actor.openKeyValueStore('actor-22-drug-safety-recalls-monitor-delta-state');
        await store.setValue('state', { seenIds: { fda: ['D-0001-2026'] }, lastRunAt: { fda: '2026-09-01T00:00:00.000Z' } });
        const loaded = await loadState();
        expect(loaded).toEqual(createEmptyState());
    });
});
