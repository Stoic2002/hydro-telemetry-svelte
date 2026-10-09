import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MonthlyAccumulationChart as ChartData } from '$features/hydrology';
import MonthlyAccumulationChart from './MonthlyAccumulationChart.svelte';

function chartData(
	values: Array<[number | null, number | null]>,
	plantCounts: [number, number] = [1, 1]
): ChartData {
	return {
		pltaId: 'plta-1',
		registeredPlantCount: 13,
		points: values.map(([target, actual], index) => ({
			period: `2026-${String(index + 1).padStart(2, '0')}`,
			year: 2026,
			month: index + 1,
			targetMwh: target,
			actualMwh: actual,
			targetPlantCount: target === null ? 0 : plantCounts[0],
			actualPlantCount: actual === null ? 0 : plantCounts[1],
			throughLabel: `s.d. Bulan ${index + 1}`
		}))
	};
}

function renderChart(
	props: Partial<Parameters<typeof render<typeof MonthlyAccumulationChart>>[1]>
) {
	return render(MonthlyAccumulationChart, {
		props: { isLoading: false, isError: false, onRetry: () => {}, ...props }
	});
}

describe('grafik akumulasi bulanan', () => {
	it('menampilkan keadaan memuat', () => {
		renderChart({ isLoading: true });

		expect(screen.getByRole('status', { name: 'Memuat grafik akumulasi' })).toBeInTheDocument();
	});

	it('menampilkan galat dengan tombol coba lagi', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		renderChart({ isError: true, onRetry });

		expect(screen.getByText('Grafik akumulasi belum bisa dimuat')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /coba lagi/i }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('menyebut periode kosong, bukan menggambar sumbu tanpa garis', () => {
		renderChart({
			chart: chartData([
				[null, null],
				[null, null]
			])
		});

		expect(
			screen.getByText('Belum ada target maupun realisasi akumulasi pada periode ini.')
		).toBeInTheDocument();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('menggambar grafik beserta legenda bila ada nilai', () => {
		renderChart({
			chart: chartData([
				[100, 90],
				[200, null],
				[300, null]
			])
		});

		expect(
			screen.getByRole('img', { name: /target dan realisasi akumulasi/i })
		).toBeInTheDocument();
		expect(screen.getByText('Target akumulasi')).toBeInTheDocument();
		expect(screen.getByText('Realisasi akumulasi')).toBeInTheDocument();
		expect(screen.getByText('Bulan yang belum diisi memutus garis.')).toBeInTheDocument();
	});

	it('memperingatkan bila jumlah PLTA penyumbang target dan realisasi berbeda', () => {
		renderChart({ chart: chartData([[100, 90]], [13, 10]) });

		expect(screen.getByText(/tidak sama pada sebagian bulan/)).toBeInTheDocument();
	});

	it('tidak memperingatkan bila penyumbangnya sama', () => {
		renderChart({ chart: chartData([[100, 90]], [1, 1]) });

		expect(screen.queryByText(/tidak sama pada sebagian bulan/)).not.toBeInTheDocument();
	});
});
