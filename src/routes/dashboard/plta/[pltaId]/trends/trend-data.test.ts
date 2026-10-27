import { describe, expect, it } from 'vitest';
import { toChartData } from './trend-data';

describe('toChartData', () => {
	it('mengurutkan titik menurut waktu dan menyimpan waktu aslinya', () => {
		const data = toChartData([
			{ time: '2026-10-27T02:00:00Z', value: 2, quality: 'good', pureQuality: true },
			{ time: '2026-10-27T01:00:00Z', value: 1, quality: 'good', pureQuality: true }
		]);

		expect(data.map((datum) => [datum.iso, datum.value])).toEqual([
			['2026-10-27T01:00:00Z', 1],
			['2026-10-27T02:00:00Z', 2]
		]);
		expect(data[0].time).toBeInstanceOf(Date);
	});

	it('mengembalikan daftar kosong tanpa titik', () => {
		expect(toChartData([])).toEqual([]);
	});
});
