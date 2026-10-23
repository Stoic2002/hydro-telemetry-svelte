import { QueryClient } from '@tanstack/svelte-query';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hydrologyQueryKeys } from '../api/queries';
import { hydrologyRepository } from '../api/repository';
import type { DailyVisibility } from '../model';
import Harness from './DailyVisibilitySheet.test-harness.svelte';

/**
 * Menyembunyikan metrik berlaku untuk semua pengguna PLTA itu. Yang dikunci:
 * hanya perubahan yang dikirim (bukan seluruh daftar), tombol simpan menunggu
 * ada perubahan, dan membuka sheet untuk PLTA lain tidak membawa pilihan lama.
 */

vi.mock('../api/repository', () => ({
	hydrologyRepository: {
		getDailyVisibility: vi.fn(),
		setDailyVisibility: vi.fn(),
		setDailyLabels: vi.fn()
	}
}));

const repository = vi.mocked(hydrologyRepository);

const PLTA_A = '11111111-1111-4111-8111-111111111111';
const PLTA_B = '22222222-2222-4222-8222-222222222222';

function visibility(
	pltaId: string,
	hiddenKeys: string[] = [],
	customOrderPanels: string[] = []
): DailyVisibility {
	const metrics = [
		{ key: 'tma_waduk', panel: 'hulu' as const, label: 'TMA Waduk' },
		{ key: 'ph_hulu', panel: 'hulu' as const, label: 'pH Hulu' },
		{ key: 'inflow', panel: 'hulu' as const, label: 'Inflow' },
		{ key: 'debit_spillway', panel: 'dam' as const, label: 'Debit Spillway' }
	].map((metric) => ({
		...metric,
		hidden: hiddenKeys.includes(metric.key),
		isCustomOrder: customOrderPanels.includes(metric.panel),
		defaultLabel: metric.label,
		isLabelCustom: false
	}));

	return { pltaId, hiddenCount: hiddenKeys.length, metrics };
}

function renderSheet(pltaId = PLTA_A, panel: 'hulu' | 'dam' | 'hilir' = 'hulu', canRename = false) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onClose = vi.fn();
	const result = render(Harness, { props: { queryClient, pltaId, panel, canRename, onClose } });

	return {
		onClose,
		queryClient,
		...result,
		switchPlant: (next: string) => result.rerender({ queryClient, pltaId: next, panel, onClose })
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('sheet atur tampilan metrik', () => {
	it('menahan tombol simpan sampai ada perubahan', async () => {
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A));

		renderSheet();

		await screen.findByRole('switch', { name: /pH Hulu/ });
		expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
	});

	it('mengirim hanya metrik yang diubah', async () => {
		const user = userEvent.setup();
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A, ['inflow']));
		repository.setDailyVisibility.mockResolvedValue(visibility(PLTA_A, ['inflow', 'ph_hulu']));

		const { onClose } = renderSheet();

		await screen.findByRole('switch', { name: /Inflow.*Sembunyi/ });
		await user.click(screen.getByRole('switch', { name: /pH Hulu/ }));
		const save = await screen.findByRole('button', { name: 'Simpan (1)' });
		await waitFor(() => expect(save).toBeEnabled());
		await user.click(save);

		await waitFor(() => expect(repository.setDailyVisibility).toHaveBeenCalledTimes(1));
		expect(repository.setDailyVisibility).toHaveBeenCalledWith(PLTA_A, {
			hidden: { ph_hulu: true },
			order: {}
		});
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('menampilkan status awal dari server', async () => {
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A, ['ph_hulu']));

		renderSheet();

		expect(await screen.findByRole('switch', { name: /pH Hulu.*Sembunyi/ })).toHaveAttribute(
			'aria-checked',
			'false'
		);
		expect(screen.getByRole('switch', { name: /TMA Waduk.*Tampil/ })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(screen.getByText('1 dari 3 metrik disembunyikan')).toBeInTheDocument();
	});

	it('menampilkan galat dengan tombol coba lagi saat daftar gagal dimuat', async () => {
		repository.getDailyVisibility.mockRejectedValue(new Error('putus'));

		renderSheet();

		expect(await screen.findByText('Daftar metrik belum dapat dimuat')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Coba lagi/ })).toBeInTheDocument();
	});

	it('tidak membawa pilihan yang belum disimpan ke PLTA lain', async () => {
		const user = userEvent.setup();
		repository.getDailyVisibility.mockImplementation(async (pltaId) => visibility(pltaId));

		const { switchPlant } = renderSheet(PLTA_A);

		const toggle = await screen.findByRole('switch', { name: /pH Hulu.*Tampil/ });
		await user.click(toggle);
		expect(screen.getByRole('button', { name: 'Simpan (1)' })).toBeEnabled();

		await switchPlant(PLTA_B);

		await waitFor(() =>
			expect(repository.getDailyVisibility).toHaveBeenCalledWith(PLTA_B, expect.anything())
		);
		await waitFor(() => expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled());
		expect(screen.getByRole('switch', { name: /pH Hulu/ })).toHaveAttribute('aria-checked', 'true');
	});

	it('pilihan yang belum disimpan bertahan, dan perubahan operator lain tidak tertimpa', async () => {
		const user = userEvent.setup();
		repository.getDailyVisibility.mockResolvedValueOnce(visibility(PLTA_A));
		// Pengambilan berikutnya: operator lain sudah menyembunyikan Inflow.
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A, ['inflow']));
		repository.setDailyVisibility.mockResolvedValue(visibility(PLTA_A, ['inflow', 'ph_hulu']));

		const { queryClient } = renderSheet(PLTA_A);

		await user.click(await screen.findByRole('switch', { name: /pH Hulu.*Tampil/ }));

		// Query ini di bawah `dashboardRoot`; isian bulanan atau harian PLTA yang
		// sama menginvalidasinya selagi sheet terbuka.
		await queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.dashboardRoot(PLTA_A) });
		await screen.findByRole('switch', { name: /Inflow.*Sembunyi/ });

		expect(screen.getByRole('switch', { name: /pH Hulu/ })).toHaveAttribute(
			'aria-checked',
			'false'
		);
		await user.click(screen.getByRole('button', { name: 'Simpan (1)' }));

		await waitFor(() => expect(repository.setDailyVisibility).toHaveBeenCalledTimes(1));
		expect(repository.setDailyVisibility).toHaveBeenCalledWith(PLTA_A, {
			hidden: { ph_hulu: true },
			order: {}
		});
	});

	it('mengurutkan lewat keyboard dan hanya mengirim panel yang diubah', async () => {
		const user = userEvent.setup();
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A));
		repository.setDailyVisibility.mockResolvedValue(visibility(PLTA_A, [], ['hulu']));

		renderSheet();

		const handle = await screen.findByRole('button', { name: /Urutkan Inflow/ });
		// Dialog memasang fokus awalnya sendiri secara asinkron; fokus yang
		// dipasang sebelum itu direbut kembali dan panahnya jatuh ke elemen lain.
		await waitFor(() => expect(document.activeElement).not.toBe(document.body));
		handle.focus();
		expect(handle).toHaveFocus();
		await user.keyboard('{ArrowUp}');

		const hulu = screen.getByRole('list', { name: 'Urutan metrik Hulu' });
		expect(
			within(hulu)
				.getAllByRole('switch')
				.map((element) => element.getAttribute('aria-label')?.split(':')[0])
		).toEqual(['TMA Waduk', 'Inflow', 'pH Hulu']);
		await waitFor(() => expect(handle).toHaveFocus());

		await user.click(screen.getByRole('button', { name: 'Simpan (1)' }));

		await waitFor(() => expect(repository.setDailyVisibility).toHaveBeenCalledTimes(1));
		expect(repository.setDailyVisibility).toHaveBeenCalledWith(PLTA_A, {
			hidden: {},
			order: { hulu: ['tma_waduk', 'inflow', 'ph_hulu'] }
		});
	});

	it('mengembalikan panel yang pernah diurutkan ke urutan bawaan', async () => {
		const user = userEvent.setup();
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A, [], ['hulu']));
		repository.setDailyVisibility.mockResolvedValue(visibility(PLTA_A));

		renderSheet();

		await user.click(await screen.findByRole('button', { name: 'Urutan bawaan' }));
		expect(screen.getByText('Urutan bawaan dipakai lagi setelah disimpan.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Urutkan Inflow/ })).toBeDisabled();

		await user.click(screen.getByRole('button', { name: 'Simpan (1)' }));

		await waitFor(() => expect(repository.setDailyVisibility).toHaveBeenCalledTimes(1));
		expect(repository.setDailyVisibility).toHaveBeenCalledWith(PLTA_A, {
			hidden: {},
			order: { hulu: [] }
		});
	});

	it('tidak menawarkan urutan bawaan untuk panel yang belum pernah diurutkan', async () => {
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A));

		renderSheet();

		await screen.findByRole('button', { name: /Urutkan Inflow/ });
		expect(screen.queryByRole('button', { name: 'Urutan bawaan' })).not.toBeInTheDocument();
	});

	it('hanya memuat dan mengirim metrik panel yang dibuka', async () => {
		const user = userEvent.setup();
		repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A));
		repository.setDailyVisibility.mockResolvedValue(visibility(PLTA_A, ['debit_spillway']));

		renderSheet(PLTA_A, 'dam');

		expect(screen.getByText('Atur tampilan Bendungan dan pelepasan')).toBeInTheDocument();
		expect(await screen.findAllByRole('switch')).toHaveLength(1);
		expect(screen.queryByRole('switch', { name: /TMA Waduk/ })).not.toBeInTheDocument();

		await user.click(screen.getByRole('switch', { name: /Debit Spillway/ }));
		await user.click(screen.getByRole('button', { name: 'Simpan (1)' }));

		await waitFor(() => expect(repository.setDailyVisibility).toHaveBeenCalledTimes(1));
		expect(repository.setDailyVisibility).toHaveBeenCalledWith(PLTA_A, {
			hidden: { debit_spillway: true },
			order: {}
		});
	});

	describe('ganti nama (admin)', () => {
		it('nama dan sakelar satu baris; kotaknya berisi nama yang berlaku', async () => {
			repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A));

			renderSheet(PLTA_A, 'hulu', true);

			const input = await screen.findByRole('textbox', { name: 'Nama pH Hulu' });
			expect(input).toHaveValue('pH Hulu');
			expect(screen.getByRole('switch', { name: /pH Hulu/ })).toBeInTheDocument();
			// Belum diganti: tidak ada tombol putar balik.
			expect(
				screen.queryByRole('button', { name: /Kembalikan nama bawaan: pH Hulu/ })
			).not.toBeInTheDocument();
		});

		it('mengirim nama baru, dan putar balik membatalkannya tanpa mengirim apa pun', async () => {
			const user = userEvent.setup();
			repository.getDailyVisibility.mockResolvedValue(visibility(PLTA_A));
			repository.setDailyLabels.mockResolvedValue(visibility(PLTA_A));

			const { onClose } = renderSheet(PLTA_A, 'hulu', true);

			const input = await screen.findByRole('textbox', { name: 'Nama Inflow' });
			await user.clear(input);
			await user.type(input, 'Debit Masuk');
			expect(await screen.findByRole('button', { name: 'Simpan (1)' })).toBeEnabled();

			await user.click(screen.getByRole('button', { name: 'Kembalikan nama bawaan: Inflow' }));
			expect(input).toHaveValue('Inflow');
			expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();

			await user.clear(input);
			await user.type(input, 'Debit Masuk');
			await user.click(screen.getByRole('button', { name: 'Simpan (1)' }));

			await waitFor(() =>
				expect(repository.setDailyLabels).toHaveBeenCalledWith(PLTA_A, { inflow: 'Debit Masuk' })
			);
			expect(repository.setDailyVisibility).not.toHaveBeenCalled();
			await waitFor(() => expect(onClose).toHaveBeenCalled());
		});
	});
});
