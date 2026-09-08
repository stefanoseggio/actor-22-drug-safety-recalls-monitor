import { describe, expect, it } from 'vitest';

import { classifyFdaRecord, classifyEmaRecord } from '../src/delta.js';
import type { RecordFingerprint } from '../src/fingerprint.js';

const FP_A: RecordFingerprint = { statusFingerprint: 'status-hash-1', contentFingerprint: 'content-hash-1' };
const FP_A_STATUS_CHANGED: RecordFingerprint = { statusFingerprint: 'status-hash-2', contentFingerprint: 'content-hash-1' };
const FP_A_CONTENT_CHANGED: RecordFingerprint = { statusFingerprint: 'status-hash-1', contentFingerprint: 'content-hash-2' };

describe('classifyFdaRecord', () => {
    it('classifies a record with no prior entry as SANCTION (this source\'s first-seen name)', () => {
        expect(classifyFdaRecord(undefined, FP_A)).toBe('SANCTION');
    });

    it('classifies a status-fingerprint change as STATUS_CHANGE', () => {
        expect(classifyFdaRecord(FP_A, FP_A_STATUS_CHANGED)).toBe('STATUS_CHANGE');
    });

    it('classifies a content-fingerprint-only change as UPDATED', () => {
        expect(classifyFdaRecord(FP_A, FP_A_CONTENT_CHANGED)).toBe('UPDATED');
    });

    it('classifies an identical fingerprint pair as SNAPSHOT_NO_DIFF', () => {
        expect(classifyFdaRecord(FP_A, { ...FP_A })).toBe('SNAPSHOT_NO_DIFF');
    });

    it('prioritizes STATUS_CHANGE over UPDATED when both fingerprints differ', () => {
        const both: RecordFingerprint = { statusFingerprint: 'status-hash-2', contentFingerprint: 'content-hash-2' };
        expect(classifyFdaRecord(FP_A, both)).toBe('STATUS_CHANGE');
    });
});

describe('classifyEmaRecord', () => {
    it('classifies a record with no prior entry as NEW_LISTING (this source\'s first-seen name)', () => {
        expect(classifyEmaRecord(undefined, FP_A)).toBe('NEW_LISTING');
    });

    it('classifies a status-fingerprint change as STATUS_CHANGE', () => {
        expect(classifyEmaRecord(FP_A, FP_A_STATUS_CHANGED)).toBe('STATUS_CHANGE');
    });

    it('classifies a content-fingerprint-only change as UPDATED', () => {
        expect(classifyEmaRecord(FP_A, FP_A_CONTENT_CHANGED)).toBe('UPDATED');
    });

    it('classifies an identical fingerprint pair as SNAPSHOT_NO_DIFF', () => {
        expect(classifyEmaRecord(FP_A, { ...FP_A })).toBe('SNAPSHOT_NO_DIFF');
    });
});
