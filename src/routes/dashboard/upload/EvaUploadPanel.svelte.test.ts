import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Plant } from '$features/plta';
import Harness from './EvaUploadPanel.test-harness.svelte';

/**
 * Kurva EVA milik satu PLTA. Berkas yang sudah dipilih adalah milik PLTA yang
 * sedang terbuka; berpindah PLTA tanpa mengosongkannya berarti berkas itu bisa
 * terunggah ke waduk yang salah — kesalahan yang tidak terlihat di layar.
 */

// Riwayat unggah memanggil API audit; isinya tidak relevan untuk aturan ini.
vi.mock('$features/audit/components/UploadHistoryPanel.svelte', async () => ({
	default: (await import('./UploadHistoryPanelStub.test-harness.svelte')).default
}));

function plant(id: string): Plant {
	return { id, code: id.toUpperCase(), name: `PLTA ${id}`, isActive: true } as Plant;
}

const PLANTS = [plant('a'), plant('b')];

function renderPanel(active: Plant) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(Harness, { props: { queryClient, plant: active, plants: PLANTS } });
}

async function pickFile() {
	const user = userEvent.setup();
	const input = document.querySelector('input[type="file"]') as HTMLInputElement;
	await user.upload(input, new File([new Uint8Array([1, 2])], 'eva-a.xlsx'));
	return user;
}

describe('berkas EVA saat PLTA diganti', () => {
	it('menyimpan pilihan berkas selama PLTA-nya tetap', async () => {
		const { rerender } = renderPanel(PLANTS[0]);

		await pickFile();
		expect(screen.getByText('eva-a.xlsx')).toBeInTheDocument();

		await rerender({ plant: PLANTS[0], plants: PLANTS });

		expect(screen.getByText('eva-a.xlsx')).toBeInTheDocument();
	});

	it('mengosongkan pilihan berkas begitu berpindah PLTA', async () => {
		const { rerender } = renderPanel(PLANTS[0]);

		await pickFile();
		expect(screen.getByText('eva-a.xlsx')).toBeInTheDocument();

		await rerender({ plant: PLANTS[1], plants: PLANTS });

		expect(screen.queryByText('eva-a.xlsx')).not.toBeInTheDocument();
		expect(screen.getByText('Tarik file Excel ke area ini')).toBeInTheDocument();
	});
});
