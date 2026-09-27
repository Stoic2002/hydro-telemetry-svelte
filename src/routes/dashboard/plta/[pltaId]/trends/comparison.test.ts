import { describe, expect, it } from 'vitest';
import {
	averageOf,
	comparisonOffsetMs,
	formatRangeLabel,
	isTrendComparison,
	mergeWithComparison,
	shiftRange
} from './comparison';

const DAY = 24 * 60 * 60 * 1_000;

function point(time: string, value: number) {
	return { time, value, quality: 'good', pureQuality: true };
}

describe('comparisonOffsetMs', () => {
	const range = { from: '2026-09-24T03:00:00.000Z', to: '2026-09-25T03:00:00.000Z' };

	it('menggeser periode sebelumnya sepanjang rentangnya sendiri', () => {
		expect(comparisonOffsetMs('previous', range)).toBe(DAY);
	});

	it('menggeser tahun lalu satu tahun kalender', () => {
		expect(comparisonOffsetMs('last-year', range)).toBe(365 * DAY);
		// Rentang yang melewati 29 Feb 2028 bergeser 366 hari, tanggalnya tetap sama.
		expect(
			comparisonOffsetMs('last-year', { from: '2028-02-01T00:00:00Z', to: '2028-03-01T00:00:00Z' })
		).toBe(366 * DAY);
	});

	it('tidak menggeser apa pun tanpa pembanding', () => {
		expect(comparisonOffsetMs('none', range)).toBe(0);
	});
});

describe('shiftRange', () => {
	it('memundurkan kedua ujung rentang', () => {
		expect(
			shiftRange({ from: '2026-09-24T03:00:00.000Z', to: '2026-09-25T03:00:00.000Z' }, DAY)
		).toEqual({ from: '2026-09-23T03:00:00.000Z', to: '2026-09-24T03:00:00.000Z' });
	});
});

describe('mergeWithComparison', () => {
	it('menempatkan titik pembanding di posisi waktu yang sebanding', () => {
		const merged = mergeWithComparison(
			[point('2026-09-25T01:00:00.000Z', 230), point('2026-09-25T02:00:00.000Z', 231)],
			[point('2026-09-24T01:00:00.000Z', 228), point('2026-09-24T02:00:00.000Z', 229)],
			DAY
		);

		expect(merged).toHaveLength(2);
		expect(merged[0]).toMatchObject({
			iso: '2026-09-25T01:00:00.000Z',
			value: 230,
			compare: 228,
			compareIso: '2026-09-24T01:00:00.000Z'
		});
	});

	it('tetap menggambar titik yang hanya ada di salah satu periode', () => {
		const merged = mergeWithComparison(
			[point('2026-09-25T02:00:00.000Z', 231)],
			[point('2026-09-24T01:00:00.000Z', 228)],
			DAY
		);

		expect(merged.map((datum) => [datum.value, datum.compare])).toEqual([
			[undefined, 228],
			[231, undefined]
		]);
	});
});

describe('formatRangeLabel', () => {
	it('menulis rentang berdasarkan hari terakhir yang tercakup', () => {
		// 25 Sep 07.00 WIB eksklusif → hari terakhir 25 Sep.
		expect(
			formatRangeLabel({ from: '2026-09-18T00:00:00.000Z', to: '2026-09-25T00:00:00.000Z' }, true)
		).toBe('18 Sep – 25 Sep 2026');
	});

	it('menulis satu tanggal bila rentang tidak melewati pergantian hari', () => {
		expect(
			formatRangeLabel({ from: '2026-09-24T18:00:00.000Z', to: '2026-09-25T06:00:00.000Z' }, false)
		).toBe('25 Sep');
	});
});

describe('lain-lain', () => {
	it('mengenali nilai URL yang sah saja', () => {
		expect(isTrendComparison('last-year')).toBe(true);
		expect(isTrendComparison('kemarin')).toBe(false);
		expect(isTrendComparison(null)).toBe(false);
	});

	it('menghitung rata-rata, atau null tanpa data', () => {
		expect(averageOf([1, 2, 3])).toBe(2);
		expect(averageOf([])).toBeNull();
	});
});
