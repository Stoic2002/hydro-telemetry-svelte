import { describe, expect, it } from 'vitest';
import type { MonthlyHydrology } from '$features/hydrology';
import { buildEnergyMonths, hasEnergyValue } from './energy-chart';

function record(month: number, values: Partial<MonthlyHydrology> = {}): MonthlyHydrology {
	return {
		id: `m-${month}`,
		pltaId: 'plta-1',
		year: 2026,
		month,
		predictedProductionMwh: 110,
		targetProductionMwh: 100,
		actualProductionMwh: 95,
		predictedAccumulatedMwh: 110 * month,
		targetAccumulatedMwh: 100 * month,
		actualAccumulatedMwh: 95 * month,
		...values
	} as MonthlyHydrology;
}

describe('buildEnergyMonths', () => {
	it('selalu dua belas bulan; bulan yang tidak dikirim server bernilai null, bukan 0', () => {
		const months = buildEnergyMonths([record(3)], 2026);

		expect(months).toHaveLength(12);
		expect(months[0]).toMatchObject({
			shortLabel: 'Jan',
			label: 'Januari 2026',
			monthly: { target: null, prediction: null, actual: null }
		});
		expect(months[2].monthly).toEqual({ target: 100, prediction: 110, actual: 95 });
		expect(months[2].accumulated).toEqual({ target: 300, prediction: 330, actual: 285 });
	});

	it('memisahkan energi bulanan dari akumulasinya, termasuk prediksi akumulasi', () => {
		const [january] = buildEnergyMonths([record(1, { predictedAccumulatedMwh: 999 })], 2026);

		expect(january.monthly.prediction).toBe(110);
		expect(january.accumulated.prediction).toBe(999);
	});

	it('mengabaikan baris tahun lain', () => {
		const months = buildEnergyMonths([record(5, { year: 2025 })], 2026);
		expect(hasEnergyValue(months, 'monthly')).toBe(false);
	});

	it('menilai ada-tidaknya nilai per bagian', () => {
		const months = buildEnergyMonths(
			[
				record(2, {
					targetProductionMwh: null,
					predictedProductionMwh: null,
					actualProductionMwh: null
				})
			],
			2026
		);

		expect(hasEnergyValue(months, 'monthly')).toBe(false);
		expect(hasEnergyValue(months, 'accumulated')).toBe(true);
	});
});
