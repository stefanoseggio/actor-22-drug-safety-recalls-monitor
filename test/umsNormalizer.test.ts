import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { normalizeFdaRecord, normalizeEmaRecord } from '../src/umsNormalizer.js';
import { REGULATORY_DATA_DISCLAIMER, FdaRecallRecordSchema, EmaAlertRecordSchema } from '../src/schemas.js';
import type { FdaEnforcementRawRecord } from '../src/sources/fdaEnforcement.js';
import type { EmaDhpcRawRecord } from '../src/sources/emaAlerts.js';

// Both fixtures were captured from REAL live requests this session (see each
// file's own _fixtureProvenance field, and src/http.ts's verified-target
// comment block) - no network calls happen in this test file itself.
const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fdaFixture = JSON.parse(readFileSync(path.join(fixturesDir, 'fda_enforcement_sample.json'), 'utf-8'));
const emaFixture = JSON.parse(readFileSync(path.join(fixturesDir, 'ema_dhpc_sample.json'), 'utf-8'));

const fdaRecords = fdaFixture.results as FdaEnforcementRawRecord[];
const emaRecords = emaFixture.data as EmaDhpcRawRecord[];

const NOW_ISO = '2026-09-07T12:00:00.000Z';

describe('normalizeFdaRecord', () => {
    it('maps every real captured FDA field to the correct UMS + native field', () => {
        // fdaRecords[1] = the "Buy-Herbal" Class I record (D-0769-2026) - real,
        // live-captured, has no termination_date (still Ongoing).
        const raw = fdaRecords[1];
        const record = normalizeFdaRecord(raw, { scrapedAt: NOW_ISO, isNew: true, eventType: null });

        expect(record.recordSource).toBe('fda_enforcement');
        expect(record.record_id).toBe('fda:D-0769-2026');
        expect(record.event_type).toBe('SANCTION');
        expect(record.scraped_at).toBe(NOW_ISO);
        expect(record.is_new).toBe(true);
        expect(record.jurisdiction).toBe('US');
        expect(record.awarding_or_regulating_agency).toBe('U.S. Food and Drug Administration (FDA)');
        expect(record.recipient_or_defendant_name).toBe('Buy-Herbal');
        expect(record.entity_identifier_native).toBe('98650');
        expect(record.reference_number).toBe('D-0769-2026');
        expect(record.category_or_type).toBe('Drugs');
        expect(record.status_or_estado).toBe('Ongoing');
        expect(record.classification).toBe('Class I');
        expect(record.recallNumber).toBe('D-0769-2026');
        expect(record.recallingFirm).toBe('Buy-Herbal');
        expect(record.productDescription).toBe('Kian Pee Wan Capsules, 30-count bottles');
        expect(record.reasonForRecall).toContain('Marketed Without an Approved NDA/ANDA');
        expect(record.city).toBe('Flushing');
        expect(record.state).toBe('NY');
        expect(record.country).toBe('United States');
        // recall_initiation_date "20260321" -> ISO
        expect(record.effective_date_iso).toBe('2026-03-21T00:00:00.000Z');
        // report_date "20260819" -> ISO
        expect(record.publish_date_iso).toBe('2026-08-19T00:00:00.000Z');
    });

    it('nulls value_native/value_currency/value_usd_normalized and source_document_url - no monetary or document field exists in this source', () => {
        const record = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(record.value_native).toBeNull();
        expect(record.value_currency).toBeNull();
        expect(record.value_usd_normalized).toBeNull();
        expect(record.source_document_url).toBeNull();
    });

    it('treats "" and "N/A" native fields as null (e.g. state on the India-origin record, empty initial_firm_notification)', () => {
        const record = normalizeFdaRecord(fdaRecords[2], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(record.state).toBeNull(); // raw state was ""
    });

    it('carries the exact mandatory regulatoryDataDisclaimer on every FDA record', () => {
        for (const raw of fdaRecords) {
            const record = normalizeFdaRecord(raw, { scrapedAt: NOW_ISO, isNew: null, eventType: null });
            expect(record.regulatoryDataDisclaimer).toBe(REGULATORY_DATA_DISCLAIMER);
            expect(record.regulatoryDataDisclaimer).toMatch(/not intended as clinical or consumer medical advice/);
            // Never presented without the disclaimer in the SAME record as the
            // severity classification field:
            expect(record).toHaveProperty('classification');
            expect(record).toHaveProperty('regulatoryDataDisclaimer');
        }
    });

    it('produces a record that validates against FdaRecallRecordSchema (zod parse succeeds - this is also exercised internally by the normalizer itself)', () => {
        const record = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(() => FdaRecallRecordSchema.parse(record)).not.toThrow();
    });
});

describe('normalizeEmaRecord', () => {
    it('maps every real captured EMA field to the correct UMS + native field', () => {
        // emaRecords[0] = the real "Jentadueto" DHPC (Quality defect), live-captured.
        const raw = emaRecords[0];
        const record = normalizeEmaRecord(raw, { scrapedAt: NOW_ISO, isNew: true, eventType: null });

        expect(record.recordSource).toBe('ema_dhpc');
        expect(record.record_id).toBe('ema:jentadueto:20/08/2026');
        expect(record.event_type).toBe('NEW_LISTING');
        expect(record.jurisdiction).toBe('EU');
        expect(record.awarding_or_regulating_agency).toBe('European Medicines Agency (EMA)');
        expect(record.recipient_or_defendant_name).toBe('Jentadueto');
        expect(record.entity_identifier_native).toBe('A10BD11');
        expect(record.category_or_type).toBe('Quality defect');
        expect(record.nameOfMedicine).toBe('Jentadueto');
        expect(record.dhpcType).toBe('Quality defect');
        expect(record.activeSubstances).toBe('linagliptin;metformin hydrochloride');
        expect(record.source_url).toBe('https://www.ema.europa.eu/en/medicines/dhpc/jentadueto');
        // dissemination_date "20/08/2026" (DD/MM/YYYY) -> ISO
        expect(record.effective_date_iso).toBe('2026-08-20T00:00:00.000Z');
        expect(record.publish_date_iso).toBe('2026-08-20T00:00:00.000Z');
    });

    it('nulls empty-string fields (procedure_number, regulatory_outcome were both "" on the live Jentadueto record)', () => {
        const record = normalizeEmaRecord(emaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(record.procedureNumber).toBeNull();
        expect(record.reference_number).toBeNull();
        expect(record.status_or_estado).toBeNull();
    });

    it('carries populated reference_number and status when the source provides them (the real Tavneos referral-driven DHPC)', () => {
        const record = normalizeEmaRecord(emaRecords[1], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(record.reference_number).toBe('EMA/REF/0000325221');
        expect(record.status_or_estado).toBe('Revocation');
        expect(record.dhpcType).toBe('Referral - Article 20 procedure');
    });

    it('nulls value_native/value_currency/value_usd_normalized and source_document_url - no monetary or separate document field exists in this source', () => {
        const record = normalizeEmaRecord(emaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(record.value_native).toBeNull();
        expect(record.value_currency).toBeNull();
        expect(record.value_usd_normalized).toBeNull();
        expect(record.source_document_url).toBeNull();
    });

    it('carries the exact mandatory regulatoryDataDisclaimer on every EMA record', () => {
        for (const raw of emaRecords) {
            const record = normalizeEmaRecord(raw, { scrapedAt: NOW_ISO, isNew: null, eventType: null });
            expect(record.regulatoryDataDisclaimer).toBe(REGULATORY_DATA_DISCLAIMER);
            expect(record).toHaveProperty('dhpcType');
            expect(record).toHaveProperty('regulatoryDataDisclaimer');
        }
    });

    it('produces a record that validates against EmaAlertRecordSchema', () => {
        const record = normalizeEmaRecord(emaRecords[1], { scrapedAt: NOW_ISO, isNew: false, eventType: null });
        expect(() => EmaAlertRecordSchema.parse(record)).not.toThrow();
    });

    it('uses a caller-supplied eventType (from src/delta.ts classification) instead of the source-default when one is given', () => {
        const statusChange = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: 'STATUS_CHANGE' });
        expect(statusChange.event_type).toBe('STATUS_CHANGE');

        const updated = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: 'UPDATED' });
        expect(updated.event_type).toBe('UPDATED');

        const unchanged = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: 'SNAPSHOT_NO_DIFF' });
        expect(unchanged.event_type).toBe('SNAPSHOT_NO_DIFF');

        const emaStatusChange = normalizeEmaRecord(emaRecords[0], { scrapedAt: NOW_ISO, isNew: false, eventType: 'STATUS_CHANGE' });
        expect(emaStatusChange.event_type).toBe('STATUS_CHANGE');
    });
});

describe('cross-source UMS envelope consistency', () => {
    it('FDA and EMA records share the identical 18-field UMS envelope + disclaimer key set, differing only in recordSource-specific native fields', () => {
        const fda = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: null, eventType: null });
        const ema = normalizeEmaRecord(emaRecords[0], { scrapedAt: NOW_ISO, isNew: null, eventType: null });
        const envelopeKeys = [
            'record_id',
            'event_type',
            'scraped_at',
            'is_new',
            'source_url',
            'recipient_or_defendant_name',
            'entity_identifier_native',
            'value_native',
            'value_currency',
            'value_usd_normalized',
            'effective_date_iso',
            'publish_date_iso',
            'category_or_type',
            'status_or_estado',
            'awarding_or_regulating_agency',
            'jurisdiction',
            'source_document_url',
            'reference_number',
            'regulatoryDataDisclaimer',
        ];
        for (const key of envelopeKeys) {
            expect(fda).toHaveProperty(key);
            expect(ema).toHaveProperty(key);
        }
    });

    it('is_new is null when the caller passes isNew: null (e.g. the MCP tool path, which has no delta-state concept)', () => {
        const fda = normalizeFdaRecord(fdaRecords[0], { scrapedAt: NOW_ISO, isNew: null, eventType: null });
        const ema = normalizeEmaRecord(emaRecords[0], { scrapedAt: NOW_ISO, isNew: null, eventType: null });
        expect(fda.is_new).toBeNull();
        expect(ema.is_new).toBeNull();
    });
});
