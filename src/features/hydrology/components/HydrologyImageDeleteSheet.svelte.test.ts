import { QueryClient } from '@tanstack/svelte-query';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../api/http';
import { hydrologyRepository } from '../api/repository';
import { hydrologyQueryKeys } from '../api/queries';
import Harness from './HydrologyImageDeleteSheet.test-harness.svelte';

/**
 * Menghapus gambar prakiraan hujan berlaku untuk SELURUH PLTA dan tidak dapat
 * dibatalkan. Yang dikunci di sini: tombolnya tidak bisa ditekan sebelum ada
 * gambar yang terbukti ada, dan setelah terhapus cache gambarnya dibuang —
 * bukan di-invalidasi, karena memuat ulang hanya akan berakhir 404.
 */

vi.mock('../api/repository', () => ({
	hydrologyRepository: {
		getMonthlyImage: vi.fn(),
		deleteMonthlyImage: vi.fn()
	}
}));

const repository = vi.mocked(hydrologyRepository);

function notFound() {
	return new ApiError('Gambar tidak ditemukan', {
		status: 404,
		statusText: 'Not Found',
		url: '/api/v1/hydrology/monthly/image'
	});
}

function renderSheet() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onClose = vi.fn();
	return { queryClient, onClose, ...render(Harness, { props: { queryClient, onClose } }) };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('panel hapus gambar prakiraan hujan', () => {
	it('menahan tombol hapus saat periode itu belum punya gambar', async () => {
		repository.getMonthlyImage.mockRejectedValue(notFound());

		renderSheet();

		await screen.findByText(/Tidak ada yang perlu dihapus/);
		expect(screen.getByRole('button', { name: 'Hapus Gambar' })).toBeDisabled();
		expect(repository.deleteMonthlyImage).not.toHaveBeenCalled();
	});

	it('menghapus setelah konfirmasi, lalu membuang cache gambarnya', async () => {
		const user = userEvent.setup();
		repository.getMonthlyImage.mockResolvedValue(new Blob(['gambar'], { type: 'image/png' }));
		repository.deleteMonthlyImage.mockResolvedValue(undefined);

		const { queryClient, onClose } = renderSheet();

		const deleteButton = await screen.findByRole('button', { name: 'Hapus Gambar' });
		await waitFor(() => expect(deleteButton).toBeEnabled());
		await user.click(deleteButton);

		// Aksi merusak lewat konfirmasi, bukan langsung dari tombolnya.
		const confirmation = await screen.findByRole('alertdialog');
		await user.click(within(confirmation).getByRole('button', { name: 'Ya, Hapus' }));

		await waitFor(() => expect(repository.deleteMonthlyImage).toHaveBeenCalledTimes(1));
		const [year, month, kind] = repository.deleteMonthlyImage.mock.calls[0];
		expect(kind).toBe('curah_hujan');
		expect(
			queryClient.getQueryData(hydrologyQueryKeys.monthlyImage(year, month, kind))
		).toBeUndefined();
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('tidak menghapus apa pun bila konfirmasi dibatalkan', async () => {
		const user = userEvent.setup();
		repository.getMonthlyImage.mockResolvedValue(new Blob(['gambar'], { type: 'image/png' }));

		renderSheet();

		const deleteButton = await screen.findByRole('button', { name: 'Hapus Gambar' });
		await waitFor(() => expect(deleteButton).toBeEnabled());
		await user.click(deleteButton);
		const confirmation = await screen.findByRole('alertdialog');
		await user.click(within(confirmation).getByRole('button', { name: 'Batal' }));

		expect(repository.deleteMonthlyImage).not.toHaveBeenCalled();
	});
});
