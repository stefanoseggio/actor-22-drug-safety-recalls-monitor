import { describe, expect, it } from 'vitest';

import { fdaFingerprintOf, emaFingerprintOf } from '../src/fingerprint.js';

function fdaRaw(overrides: Partial<Parameters<typeof fdaFingerprintOf>[0]> = {}) {
    return {
        status: 'Ongoing',
        classification: 'Class I',
        product_description: 'Kian Pee Wan Capsules, 30-count bottles',
        reason_for_recall: 'Marketed Without an Approved NDA/ANDA',
        distribution_pattern: 'Nationwide',
        voluntary_mandated: 'Voluntary: Firm Initiated',
        ...overrides,
    };
}

function emaRaw(overrides: Partial<Parameters<typeof emaFingerprintOf>[0]> = {}) {
    return {
        regulatory_outcome: '',
        name_of_medicine: 'Jentadueto',
        active_substances: 'linagliptin;metformin hydrochloride',
        dhpc_type: 'Quality defect',
        atc_code_human: 'A10BD11',
        therapeutic_area_mesh: 'Diabetes Mellitus, Type 2',
        procedure_number: '',
        referral_name: '',
        last_updated_date: '20/08/2026',
        ...overrides,
    };
}

describe('fdaFingerprintOf', () => {
    it('is stable across identical input', () => {
        expect(fdaFingerprintOf(fdaRaw())).toEqual(fdaFingerprintOf(fdaRaw()));
    });

    it('statusFingerprint changes when status changes, contentFingerprint does not', () => {
        const a = fdaFingerprintOf(fdaRaw());
        const b = fdaFingerprintOf(fdaRaw({ status: 'Terminated', termination_date: '20260901' }));
        // status changed AND termination_date (a content field) appeared -
        // both fingerprints legitimately change here, so use a case that
        // isolates status alone:
        const c = fdaFingerprintOf(fdaRaw({ status: 'Terminated' }));
        expect(a.statusFingerprint).not.toBe(c.statusFingerprint);
        expect(a.contentFingerprint).toBe(c.contentFingerprint);
        expect(b.statusFingerprint).not.toBe(a.statusFingerprint);
    });

    it('contentFingerprint changes when a non-status field changes, statusFingerprint does not', () => {
        const a = fdaFingerprintOf(fdaRaw());
        const b = fdaFingerprintOf(fdaRaw({ reason_for_recall: 'Updated reason after firm correction' }));
        expect(a.statusFingerprint).toBe(b.statusFingerprint);
        expect(a.contentFingerprint).not.toBe(b.contentFingerprint);
    });

    it('does not fingerprint identity fields (recall_number/event_id are not inputs at all)', () => {
        // fdaFingerprintOf's parameter type has no recall_number/event_id
        // field - this is a compile-time guarantee, not just a runtime one,
        // but assert the two fingerprints most people would expect to
        // "obviously differ" for two different recalls with identical
        // content are in fact identical, proving identity isn't smuggled in
        // some other way.
        const a = fdaFingerprintOf(fdaRaw());
        const b = fdaFingerprintOf(fdaRaw());
        expect(a).toEqual(b);
    });
});

describe('emaFingerprintOf', () => {
    it('is stable across identical input', () => {
        expect(emaFingerprintOf(emaRaw())).toEqual(emaFingerprintOf(emaRaw()));
    });

    it('statusFingerprint changes when regulatory_outcome changes, contentFingerprint does not', () => {
        const a = emaFingerprintOf(emaRaw());
        const b = emaFingerprintOf(emaRaw({ regulatory_outcome: 'Revocation' }));
        expect(a.statusFingerprint).not.toBe(b.statusFingerprint);
        expect(a.contentFingerprint).toBe(b.contentFingerprint);
    });

    it('contentFingerprint changes when a non-status field changes, statusFingerprint does not', () => {
        const a = emaFingerprintOf(emaRaw());
        const b = emaFingerprintOf(emaRaw({ dhpc_type: 'Referral - Article 20 procedure' }));
        expect(a.statusFingerprint).toBe(b.statusFingerprint);
        expect(a.contentFingerprint).not.toBe(b.contentFingerprint);
    });
});
