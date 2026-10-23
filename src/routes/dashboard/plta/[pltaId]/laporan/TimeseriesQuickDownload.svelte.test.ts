import { QueryClient } from '@tanstack/svelte-query';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportsRepository } from '$features/reports/api/repository';
import { trendsRepository } from '$features/trends/api/repository';
import { downloadBlob } from '$shared/lib/download';
import Harness from './TimeseriesQuickDownload.test-harness.svelte';

/**
 * Excel per jam kini tombol di toolbar daftar laporan yang membuka sheet,
 * bukan kartu permanen. Yang dikunci: sheet baru muncul setelah tombol
 * ditekan, sumber berkasnya mengikuti apakah daftar tren sudah diatur, dan
 * sheet tertutup sendiri setelah berkas diunduh.
 */

vi.mock('$features/trends/api/repository', () => ({
	trendsRepository: { getPlantTrendList: vi.fn(), downloadPlantTrendData: vi.fn() }
}));
vi.mock('$features/reports/api/repository', () => ({
	reportsRepository: { downloadTimeseriesExcel: vi.fn() }
}));
vi.mock('$shared/lib/download', () => ({ downloadBlob: vi.fn() }));

const trends = vi.mocked(trendsRepository);
const reports = vi.mocked(reportsRepository);
const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function trendList(isConfigured: boolean) {
	return { isConfigured, items: isConfigured ? [{ key: 'tma_waduk' }] : [] } as unknown as Awaited<
		ReturnType<typeof trendsRepository.getPlantTrendList>
	>;
}

function renderButton() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(Harness, { props: { queryClient } });
}

beforeEach(() => {
	// Sheet test sebelumnya mengunci `body` (pointer-events: none) dan bits-ui
	// baru melepasnya lewat timer; sama seperti di ElevationCurveList.
	document.body.removeAttribute('style');
	vi.clearAllMocks();
});

describe('Excel per jam', () => {
	it('tombol membuka sheet; dengan daftar tren, unduhan memakai data tren lalu sheet tertutup', async () => {
		const user = userEvent.setup();
		const blob = new Blob(['x']);
		trends.getPlantTrendList.mockResolvedValue(trendList(true));
		trends.downloadPlantTrendData.mockResolvedValue(blob);

		renderButton();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Excel per jam' }));
		const dialog = await screen.findByRole('dialog');
		expect(dialog).toHaveTextContent('Satu kolom per item daftar tren Soedirman');

		const download = screen.getByRole('button', { name: 'Unduh Excel' });
		await waitFor(() => expect(download).toBeEnabled());
		await user.click(download);

		await waitFor(() => expect(trends.downloadPlantTrendData).toHaveBeenCalledTimes(1));
		expect(trends.downloadPlantTrendData.mock.calls[0][0]).toMatchObject({
			pltaId: PLTA_ID,
			resolution: '1h'
		});
		expect(reports.downloadTimeseriesExcel).not.toHaveBeenCalled();
		expect(vi.mocked(downloadBlob)).toHaveBeenCalledWith(blob, expect.stringMatching(/^tren-pbs-/));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('tanpa daftar tren, jatuh ke format lama 13 kolom', async () => {
		const user = userEvent.setup();
		trends.getPlantTrendList.mockResolvedValue(trendList(false));
		reports.downloadTimeseriesExcel.mockResolvedValue(new Blob(['x']));

		renderButton();
		await user.click(screen.getByRole('button', { name: 'Excel per jam' }));
		expect(await screen.findByRole('dialog')).toHaveTextContent('format lama');

		const download = screen.getByRole('button', { name: 'Unduh Excel' });
		await waitFor(() => expect(download).toBeEnabled());
		await user.click(download);

		await waitFor(() => expect(reports.downloadTimeseriesExcel).toHaveBeenCalledTimes(1));
		expect(trends.downloadPlantTrendData).not.toHaveBeenCalled();
	});
});
