import { QueryClient } from '@tanstack/svelte-query';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pltaRepository } from '../api/repository';
import type { Plant } from '../model';
import Harness from './PlantFormSheet.test-harness.svelte';

/**
 * Yang dikunci: ubah hanya mengirim bidang yang berubah (bukan seluruh isian,
 * dan tidak pernah `constants`), dan isian tambah yang belum lengkap ditahan
 * di form dengan pesan per bidang, tanpa permintaan ke server.
 */

vi.mock('../api/repository', () => ({
	pltaRepository: { createPlant: vi.fn(), updatePlant: vi.fn() }
}));

const repository = vi.mocked(pltaRepository);
const WS = {
	id: '22222222-2222-4222-8222-222222222222',
	code: 'WS-SERAYU',
	name: 'Serayu',
	description: null
};

const SAVED: Plant = {
	id: '11111111-1111-4111-8111-111111111111',
	code: 'PBS',
	name: 'Soedirman',
	riverBasinId: WS.id,
	latitude: -7.39,
	longitude: 109.68,
	capacityMw: 184.5,
	description: null,
	isActive: true,
	bebanToOutflowNum: 204,
	bebanToOutflowDen: 180,
	constants: { tma_limpas: 231.5 }
};

function renderSheet(plant: Plant | null) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onClose = vi.fn();
	render(Harness, { props: { queryClient, plant, riverBasins: [WS], onClose } });
	return { onClose };
}

beforeEach(() => {
	document.body.removeAttribute('style');
	vi.clearAllMocks();
});

describe('sheet PLTA', () => {
	it('ubah: kode terkunci, dan hanya bidang yang berubah yang dikirim', async () => {
		const user = userEvent.setup();
		repository.updatePlant.mockResolvedValue({ ...SAVED, name: 'PLTA Soedirman' });

		const { onClose } = renderSheet(SAVED);

		expect(screen.getByRole('textbox', { name: 'Kode' })).toBeDisabled();
		const save = screen.getByRole('button', { name: 'Simpan' });
		expect(save).toBeDisabled();

		const name = screen.getByRole('textbox', { name: 'Nama' });
		await user.clear(name);
		await user.type(name, 'PLTA Soedirman');
		await user.click(save);

		await waitFor(() =>
			expect(repository.updatePlant).toHaveBeenCalledWith(SAVED.id, { name: 'PLTA Soedirman' })
		);
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('ubah status di PLTA berdata lama yang tak lolos aturan form tetap bisa disimpan', async () => {
		// Regresi laporan tim 27 Okt 2026: lintang tanpa bujur membuat Simpan
		// mati selamanya untuk PLTA ini, sementara PLTA lain bisa.
		const user = userEvent.setup();
		const legacy: Plant = { ...SAVED, latitude: -7.39, longitude: null };
		repository.updatePlant.mockResolvedValue({ ...legacy, isActive: false });

		const { onClose } = renderSheet(legacy);

		await user.click(screen.getByRole('switch', { name: /Status PLTA/ }));
		const save = screen.getByRole('button', { name: 'Simpan' });
		expect(save).toBeEnabled();
		await user.click(save);

		await waitFor(() =>
			expect(repository.updatePlant).toHaveBeenCalledWith(legacy.id, { isActive: false })
		);
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('tambah: isian belum lengkap ditahan dengan pesan per bidang', async () => {
		const user = userEvent.setup();

		renderSheet(null);

		await user.type(screen.getByRole('textbox', { name: 'Kode' }), 'PBX');
		await user.type(screen.getByRole('spinbutton', { name: 'Lintang' }), '-7.4');
		await user.click(screen.getByRole('button', { name: 'Tambah' }));

		expect(await screen.findByText('Nama wajib diisi.')).toBeInTheDocument();
		expect(screen.getByText('Isi lintang dan bujur sekaligus.')).toBeInTheDocument();
		expect(repository.createPlant).not.toHaveBeenCalled();
	});
});
