import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '$features/auth';
import type { Plant } from '$features/plta';
import { hydrologyRepository } from '$features/hydrology/api/repository';
import Harness from './MonthlyPage.test-harness.svelte';

/**
 * Viewer hanya membaca. Halaman Hidrologi Bulanan tetap terbuka untuknya, tetapi
 * tombol "Input data"/"Edit data" beserta form isiannya tidak boleh dirender —
 * bukan sekadar dinonaktifkan.
 */

vi.mock('$features/hydrology/api/repository', () => ({
	hydrologyRepository: {
		getMonthlyPanel: vi.fn(),
		getMonthlyImage: vi.fn()
	}
}));

// Pemilih PLTA memanggil katalog; isinya tidak relevan untuk aturan ini.
vi.mock('$features/plta/components/PlantSwitcher.svelte', async () => ({
	default: (await import('./PlantSwitcherStub.test-harness.svelte')).default
}));

const repository = vi.mocked(hydrologyRepository);

const PLANT = {
	id: '11111111-1111-4111-8111-111111111111',
	code: 'PLTA-SDR',
	name: 'PLTA Soedirman'
} as Plant;

function renderPage() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

	return render(Harness, {
		props: {
			queryClient,
			activePLTA: { pltaId: PLANT.id, plant: PLANT, displayName: 'Soedirman' }
		}
	});
}

function signInAs(role: 'Viewer' | 'Operator PLTA') {
	authStore.user = {
		id: 'user-1',
		name: 'Uji',
		username: 'uji',
		email: 'uji@contoh.id',
		role,
		accessPLTA: [],
		status: 'Aktif'
	};
	authStore.isAuthenticated = true;
}

beforeEach(() => {
	vi.clearAllMocks();
	repository.getMonthlyPanel.mockResolvedValue(null);
	repository.getMonthlyImage.mockRejectedValue(new Error('tidak dipakai'));
});

describe('isian ringkasan bulanan per peran', () => {
	it('tidak dirender untuk Viewer', async () => {
		signInAs('Viewer');

		renderPage();

		await screen.findByText('Hidrologi Bulanan');
		expect(screen.queryByRole('button', { name: /^(Input|Edit) data$/ })).not.toBeInTheDocument();
	});

	it('tersedia untuk Operator PLTA', async () => {
		signInAs('Operator PLTA');

		renderPage();

		expect(await screen.findByRole('button', { name: /^(Input|Edit) data$/ })).toBeInTheDocument();
	});
});
