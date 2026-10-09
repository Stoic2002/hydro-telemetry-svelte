import { QueryClient } from '@tanstack/svelte-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pltaRepository } from '../api/repository';
import type { PlantTag } from '../model';
import Harness from './TagBoundsSheet.test-harness.svelte';

/**
 * Batas valid memengaruhi penandaan kualitas data di server. Yang dikunci:
 * rentang yang mustahil tidak bisa disimpan, kedua sisi dikirim bersama, dan
 * mencabut pembatasan butuh peringatan.
 */

vi.mock('../api/repository', () => ({
	pltaRepository: { updateTagBounds: vi.fn() }
}));

const repository = vi.mocked(pltaRepository);

function makeTag(patch: Partial<PlantTag> = {}): PlantTag {
	return {
		id: 'tag-1',
		pltaId: 'plta-1',
		parameter: 'water_level',
		station: '',
		protocol: 'opcua',
		address: '',
		httpHeaders: {},
		valuePath: null,
		timestampPath: null,
		scale: 1,
		offset: 0,
		unit: 'mdpl',
		enabled: true,
		label: 'TMA Waduk',
		minValid: 220,
		maxValid: 231,
		...patch
	};
}

function renderSheet(tag: PlantTag = makeTag()) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onClose = vi.fn();
	return { onClose, ...render(Harness, { props: { queryClient, tag, onClose } }) };
}

/**
 * Isian diisi dari tag lewat `$effect`, sesudah render pertama. Mengetik
 * sebelum itu tertimpa nilai tersimpan — di mesin yang sibuk, tes yang tidak
 * menunggu menjadi flaky. Pengguna sungguhan tidak secepat itu.
 */
async function untilFilled(expectedMin = 220, expectedMax = 231) {
	await waitFor(() => {
		expect(screen.getByLabelText('Batas bawah')).toHaveValue(expectedMin);
		expect(screen.getByLabelText('Batas atas')).toHaveValue(expectedMax);
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

/**
 * Mengisi satu field dengan SATU event input. `user.clear` + `user.type`
 * menghasilkan keadaan antara (kosong, lalu "2", "23", …) yang masing-masing
 * sudah membuat tombol Simpan aktif — di mesin sibuk klik bisa jatuh di antaranya.
 */
function setValue(label: string, value: number | '') {
	fireEvent.input(screen.getByLabelText(label), { target: { value: String(value) } });
}

describe('sheet batas valid tag', () => {
	it('menahan simpan sampai ada perubahan, dan mengisi batas tersimpan', async () => {
		renderSheet();

		await untilFilled();
		expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
	});

	it('menolak batas bawah yang tidak lebih kecil dari batas atas', async () => {
		renderSheet();

		await untilFilled();
		setValue('Batas atas', 200);

		expect(
			await screen.findByText('Batas bawah harus lebih kecil dari batas atas.')
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
	});

	it('mengirim kedua sisi saat menyimpan', async () => {
		const user = userEvent.setup();
		repository.updateTagBounds.mockResolvedValue(makeTag({ maxValid: 235 }));
		const { onClose } = renderSheet();

		await untilFilled();
		setValue('Batas atas', 235);
		const save = screen.getByRole('button', { name: 'Simpan' });
		await waitFor(() => expect(save).toBeEnabled());
		await user.click(save);

		await waitFor(() => expect(repository.updateTagBounds).toHaveBeenCalledTimes(1));
		expect(repository.updateTagBounds).toHaveBeenCalledWith('tag-1', {
			minValid: 220,
			maxValid: 235
		});
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it('memperingatkan saat kedua batas dikosongkan', async () => {
		renderSheet();

		await untilFilled();
		setValue('Batas bawah', '');
		setValue('Batas atas', '');

		expect(await screen.findByText('Pembatasan akan dicabut')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled();
	});
});
