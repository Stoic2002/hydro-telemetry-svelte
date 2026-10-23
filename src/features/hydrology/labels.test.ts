import { describe, expect, it } from 'vitest';
import { isCustomLabelValue, labelChanges } from './labels';

const saved = [
	{ key: 'tma_waduk', label: 'Elevasi Waduk', defaultLabel: 'TMA Waduk', isCustom: true },
	{ key: 'inflow', label: 'Inflow', defaultLabel: 'Inflow', isCustom: false },
	{ key: 'head', label: 'Head', defaultLabel: 'Head', isCustom: false }
];

describe('perubahan nama', () => {
	it('hanya mengirim isian yang disentuh dan berbeda', () => {
		expect(labelChanges(saved, { inflow: 'Debit Masuk', head: '' })).toEqual({
			inflow: 'Debit Masuk'
		});
	});

	it('isian kosong pada nama khusus = kembali ke bawaan', () => {
		expect(labelChanges(saved, { tma_waduk: '  ' })).toEqual({ tma_waduk: null });
	});

	it('merapikan spasi dan tidak mengirim nama yang sama', () => {
		expect(labelChanges(saved, { tma_waduk: ' Elevasi   Waduk ' })).toEqual({});
	});

	it('nama yang sama dengan bawaan = kembali ke bawaan, bukan nama khusus', () => {
		// Kotak nama kini berisi nama bawaan saat belum diganti; tombol putar
		// balik mengisinya dengan nama bawaan.
		expect(labelChanges(saved, { tma_waduk: 'TMA  Waduk' })).toEqual({ tma_waduk: null });
		expect(labelChanges(saved, { inflow: 'Inflow' })).toEqual({});
	});
});

describe('isCustomLabelValue', () => {
	it.each([
		['Debit Masuk', true],
		[' Inflow ', false],
		['', false],
		['   ', false]
	])('"%s" terhadap bawaan "Inflow" → %s', (value, expected) => {
		expect(isCustomLabelValue(value, 'Inflow')).toBe(expected);
	});
});
