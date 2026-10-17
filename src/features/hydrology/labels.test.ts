import { describe, expect, it } from 'vitest';
import { labelChanges } from './labels';

const saved = [
	{ key: 'tma_waduk', label: 'Elevasi Waduk', isCustom: true },
	{ key: 'inflow', label: 'Inflow', isCustom: false },
	{ key: 'head', label: 'Head', isCustom: false }
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
});
