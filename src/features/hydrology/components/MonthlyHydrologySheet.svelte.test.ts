import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MonthlyHydrology } from '../model';
import Harness from './MonthlyHydrologySheet.test-harness.svelte';

/**
 * Dulu efek pengisi form menulis `values` lalu membacanya lagi untuk baseline,
 * sehingga efeknya memicu dirinya sendiri sampai `effect_update_depth_exceeded`.
 * Di staging, menekan "Edit data" di Hidrologi Bulanan membuat seluruh halaman
 * jatuh ke "Halaman ini gagal ditampilkan".
 */

const RECORD: MonthlyHydrology = {
	id: 'row-1',
	pltaId: 'plta-1',
	year: 2026,
	month: 9,
	hydrologyPrediction: 'basah',
	hydrologyActual: 'normal',
	images: {
		prediksi_sifat_hujan: null,
		prediksi_curah_hujan: null,
		realisasi_sifat_hujan: null,
		realisasi_curah_hujan: null
	},
	predictedProductionMwh: 423432,
	targetProductionMwh: 200,
	actualProductionMwh: null,
	predictedAccumulatedMwh: 358900,
	targetAccumulatedMwh: 391600,
	actualAccumulatedMwh: 432432,
	monthlyAchievement: { percentage: 211716, status: 'achieved' },
	accumulatedAchievement: { percentage: 91.7, status: 'not-achieved' }
};

function renderSheet(record?: MonthlyHydrology) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const onError = vi.fn();
	render(Harness, { props: { queryClient, record, onError } });
	return { onError };
}

describe('panel input hidrologi bulanan', () => {
	it('terbuka dengan isian dari data tersimpan tanpa galat render', async () => {
		const { onError } = renderSheet(RECORD);

		expect(await screen.findByLabelText('Target Produksi Energi Listrik')).toHaveValue(200);
		expect(screen.getByLabelText('Realisasi Akumulasi Produksi Energi Listrik')).toHaveValue(
			432432
		);
		expect(screen.getByLabelText('Prediksi Hidrologi')).toHaveValue('basah');
		expect(onError).not.toHaveBeenCalled();
	});

	it('terbuka untuk periode yang belum punya data', async () => {
		const { onError } = renderSheet();

		expect(await screen.findByLabelText('Target Produksi Energi Listrik')).toHaveValue(null);
		expect(onError).not.toHaveBeenCalled();
	});

	it('mempertahankan ketikan operator, bukan mengembalikannya ke data tersimpan', async () => {
		const user = userEvent.setup();
		const { onError } = renderSheet(RECORD);

		const target = await screen.findByLabelText('Target Produksi Energi Listrik');
		await user.clear(target);
		await user.type(target, '6400');

		expect(target).toHaveValue(6400);
		expect(onError).not.toHaveBeenCalled();
	});
});
