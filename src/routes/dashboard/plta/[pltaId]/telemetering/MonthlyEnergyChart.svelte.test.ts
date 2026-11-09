import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { MonthlyHydrology } from '$features/hydrology';
import MonthlyEnergyChart from './MonthlyEnergyChart.svelte';
import { buildEnergyMonths } from './energy-chart';

function months(entries: Array<Partial<MonthlyHydrology> & { month: number }>) {
	return buildEnergyMonths(
		entries.map(
			(entry) =>
				({
					year: 2026,
					predictedProductionMwh: null,
					targetProductionMwh: null,
					actualProductionMwh: null,
					predictedAccumulatedMwh: null,
					targetAccumulatedMwh: null,
					actualAccumulatedMwh: null,
					...entry
				}) as MonthlyHydrology
		),
		2026
	);
}

describe('grafik energi bulanan + akumulasi', () => {
	it('menyebut tahun kosong, bukan menggambar sumbu tanpa isi', () => {
		render(MonthlyEnergyChart, { props: { months: months([]) } });

		expect(screen.getByText('Belum ada energi pada tahun ini.')).toBeInTheDocument();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('tetap digambar bila hanya akumulasinya yang terisi', () => {
		render(MonthlyEnergyChart, {
			props: { months: months([{ month: 1, targetAccumulatedMwh: 100 }]) }
		});

		expect(
			screen.getByRole('img', { name: /energi bulanan \(batang\) dan akumulasi \(garis\)/i })
		).toBeInTheDocument();
	});

	it('satu grafik dengan legenda batang (sumbu kiri) dan garis (sumbu kanan)', () => {
		render(MonthlyEnergyChart, {
			props: {
				months: months([
					{
						month: 1,
						targetProductionMwh: 100,
						predictedProductionMwh: 110,
						actualProductionMwh: 95,
						targetAccumulatedMwh: 100,
						predictedAccumulatedMwh: 110,
						actualAccumulatedMwh: 95
					}
				])
			}
		});

		expect(screen.getAllByRole('img')).toHaveLength(1);
		expect(screen.getByText('Bulanan · sumbu kiri')).toBeInTheDocument();
		expect(screen.getByText('Akumulasi · sumbu kanan')).toBeInTheDocument();
		// Tiap seri muncul sekali di legenda batang dan sekali di legenda garis.
		for (const label of ['Target', 'Prediksi', 'Realisasi']) {
			expect(screen.getAllByText(label)).toHaveLength(2);
		}
	});
});
