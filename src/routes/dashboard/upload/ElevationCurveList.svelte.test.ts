import { QueryClient } from '@tanstack/svelte-query';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadsRepository } from '$features/uploads/api/repository';
import type { ElevationCurveSummary } from '$features/uploads';
import Harness from './ElevationCurveList.test-harness.svelte';

/**
 * Kurva draft tidak dipakai perhitungan apa pun; layar ini satu-satunya jalan
 * mem-publish-nya dari aplikasi. Yang dikunci: publish langsung jalan,
 * menurunkan kurva yang SEDANG BERLAKU dan menghapus draft lewat konfirmasi.
 */

vi.mock('$features/uploads/api/repository', () => ({
	uploadsRepository: {
		listElevationCurves: vi.fn(),
		setElevationCurveStatus: vi.fn(),
		deleteElevationCurve: vi.fn(),
		getElevationStatus: vi.fn(),
		downloadElevationTemplate: vi.fn(),
		uploadElevationExcel: vi.fn()
	}
}));

const repository = vi.mocked(uploadsRepository);
const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function curve(patch: Partial<ElevationCurveSummary>): ElevationCurveSummary {
	return {
		id: '22222222-2222-4222-8222-222222222222',
		pltaId: PLTA_ID,
		plantCode: 'PLTA-001',
		plantName: 'PB Soedirman',
		year: 2026,
		status: 'draft',
		pointCount: 701,
		minElevation: 220,
		maxElevation: 231.5,
		isEffective: false,
		twins: [],
		...patch
	};
}

const DRAFT = curve({ id: '33333333-3333-4333-8333-333333333333', year: 2030 });
const EFFECTIVE = curve({
	id: '44444444-4444-4444-8444-444444444444',
	status: 'published',
	isEffective: true
});
const OLD_PUBLISHED = curve({
	id: '55555555-5555-4555-8555-555555555555',
	year: 2020,
	status: 'published'
});

function renderList() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(Harness, { props: { queryClient, pltaId: PLTA_ID } });
}

function rowOf(year: number) {
	return screen.getByRole('cell', { name: String(year) }).closest('tr') as HTMLElement;
}

beforeEach(() => {
	// Dialog konfirmasi test sebelumnya mengunci `body` (pointer-events: none) dan
	// bits-ui baru melepasnya lewat timer; tanpa ini klik berikutnya ditolak.
	document.body.removeAttribute('style');
	vi.clearAllMocks();
	repository.listElevationCurves.mockResolvedValue([DRAFT, EFFECTIVE, OLD_PUBLISHED]);
	repository.setElevationCurveStatus.mockResolvedValue();
	repository.deleteElevationCurve.mockResolvedValue();
});

describe('daftar kurva EVA', () => {
	it('menandai kurva yang berlaku dan meminta daftar untuk PLTA ini', async () => {
		renderList();

		await screen.findByRole('cell', { name: '2030' });
		expect(repository.listElevationCurves).toHaveBeenCalledWith(
			{ pltaId: PLTA_ID, year: 2026 },
			expect.anything()
		);
		expect(within(rowOf(2026)).getByText('Berlaku')).toBeInTheDocument();
		expect(within(rowOf(2020)).queryByText('Berlaku')).not.toBeInTheDocument();
	});

	it('mem-publish draft tanpa konfirmasi', async () => {
		const user = userEvent.setup();
		renderList();

		await user.click(
			within(await waitFor(() => rowOf(2030))).getByRole('button', { name: 'Publish' })
		);

		await waitFor(() =>
			expect(repository.setElevationCurveStatus).toHaveBeenCalledWith(DRAFT.id, 'published')
		);
	});

	it('menurunkan kurva yang berlaku hanya setelah dikonfirmasi', async () => {
		const user = userEvent.setup();
		renderList();

		await user.click(
			within(await waitFor(() => rowOf(2026))).getByRole('button', { name: 'Jadikan draft' })
		);
		expect(repository.setElevationCurveStatus).not.toHaveBeenCalled();

		await user.click(await screen.findByRole('button', { name: 'Ya, jadikan draft' }));

		await waitFor(() =>
			expect(repository.setElevationCurveStatus).toHaveBeenCalledWith(EFFECTIVE.id, 'draft')
		);
	});

	it('menurunkan kurva published yang tidak berlaku tanpa konfirmasi', async () => {
		const user = userEvent.setup();
		renderList();

		await user.click(
			within(await waitFor(() => rowOf(2020))).getByRole('button', { name: 'Jadikan draft' })
		);

		await waitFor(() =>
			expect(repository.setElevationCurveStatus).toHaveBeenCalledWith(OLD_PUBLISHED.id, 'draft')
		);
		expect(screen.queryByRole('button', { name: 'Ya, jadikan draft' })).not.toBeInTheDocument();
	});

	it('menghapus draft hanya setelah dikonfirmasi; kurva published tidak punya tombol hapus', async () => {
		const user = userEvent.setup();
		renderList();

		expect(
			within(await waitFor(() => rowOf(2026))).queryByRole('button', { name: /Hapus/ })
		).not.toBeInTheDocument();

		await user.click(within(rowOf(2030)).getByRole('button', { name: 'Hapus kurva draft 2030' }));
		expect(repository.deleteElevationCurve).not.toHaveBeenCalled();

		await user.click(await screen.findByRole('button', { name: 'Ya, Hapus' }));

		await waitFor(() => expect(repository.deleteElevationCurve).toHaveBeenCalledWith(DRAFT.id));
	});

	it('memperingatkan kurva yang titiknya identik dengan PLTA lain', async () => {
		repository.listElevationCurves.mockResolvedValue([
			curve({
				twins: [
					{
						id: '66666666-6666-4666-8666-666666666666',
						pltaId: '77777777-7777-4777-8777-777777777777',
						plantCode: 'PLTA-JLO',
						plantName: 'Jelok',
						year: 2025,
						status: 'published'
					}
				]
			})
		]);
		renderList();

		expect(
			await screen.findByText(/identik dengan\s+Jelok 2025 \(published\)/)
		).toBeInTheDocument();
	});
});
