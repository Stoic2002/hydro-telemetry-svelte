import { describe, expect, it } from 'vitest';
import {
	draftFromList,
	draftToInput,
	validateTrendDraft,
	type TrendListDraftItem
} from './trend-list';

function item(key: string, overrides: Partial<TrendListDraftItem> = {}): TrendListDraftItem {
	return { key, defaultLabel: key, label: '', group: '', unit: 'm', panel: 'hulu', ...overrides };
}

describe('draf daftar tren', () => {
	it('mengurutkan menurut urutan server dan hanya menyalin nama khusus', () => {
		const draft = draftFromList(
			{
				pltaId: 'p',
				isConfigured: true,
				charts: [],
				items: [
					{
						id: '2',
						key: 'inflow',
						order: 1,
						group: null,
						label: 'Inflow',
						isLabelCustom: false,
						unit: 'm3/s',
						panel: 'hulu',
						source: 'measured'
					},
					{
						id: '1',
						key: 'tma_waduk',
						order: 0,
						group: 'TMA',
						label: 'Elevasi',
						isLabelCustom: true,
						unit: 'mdpl',
						panel: 'hulu',
						source: 'measured'
					}
				]
			},
			[]
		);

		expect(draft.map((entry) => entry.key)).toEqual(['tma_waduk', 'inflow']);
		expect(draft[0]).toMatchObject({ label: 'Elevasi', group: 'TMA' });
		expect(draft[1].label).toBe('');
	});

	it('merapikan spasi dan mengirim isian kosong sebagai null', () => {
		expect(draftToInput([item('a', { label: '  Debit   masuk ', group: ' ' })])).toEqual([
			{ key: 'a', label: 'Debit masuk', group: null }
		]);
	});

	it('menolak grup dengan lebih dari dua satuan', () => {
		const problems = validateTrendDraft([
			item('a', { group: 'G', unit: 'm' }),
			item('b', { group: 'G', unit: 'm3/s' }),
			item('c', { group: 'G', unit: 'mm' })
		]);

		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('3 satuan');
	});

	it('menolak lebih dari 50 item', () => {
		const draft = Array.from({ length: 51 }, (_, index) => item(`k${index}`));
		expect(validateTrendDraft(draft)[0]).toContain('Maksimal 50');
	});
});
