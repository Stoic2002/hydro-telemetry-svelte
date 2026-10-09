import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpReportsRepository } from './http-reports-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

function report(patch: Record<string, unknown> = {}) {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		type: 'monthly',
		template: 'timeseries',
		status: 'completed',
		parameters: null,
		plta_id: null,
		ws_id: null,
		period_start: '2026-09-01T00:00:00+07:00',
		period_end: '2026-09-30T23:59:59+07:00',
		file_path: 'reports/a.xlsx',
		error: null,
		created_at: '2026-10-01T03:00:00Z',
		...patch
	};
}

beforeEach(() => {
	apiRequestMock.mockReset();
});

describe('pembuat laporan', () => {
	it('memetakan `requested_by_username`', async () => {
		apiRequestMock.mockResolvedValue(report({ requested_by_username: 'budi' }));

		const result = await httpReportsRepository.get('11111111-1111-4111-8111-111111111111');

		expect(result.requestedBy).toBe('budi');
	});

	it('menganggap pembuat tidak diketahui bila field tidak ada atau null', async () => {
		apiRequestMock.mockResolvedValueOnce(report());
		apiRequestMock.mockResolvedValueOnce(report({ requested_by_username: null }));

		expect((await httpReportsRepository.get('a')).requestedBy).toBeNull();
		expect((await httpReportsRepository.get('b')).requestedBy).toBeNull();
	});

	it('memetakan pembuat pada daftar laporan', async () => {
		apiRequestMock.mockResolvedValue({
			items: [report({ requested_by_username: 'sari' })],
			total: 1,
			page: 1,
			limit: 10,
			pages: 1
		});

		const page = await httpReportsRepository.list({ page: 1, limit: 10 });

		expect(page.items[0].requestedBy).toBe('sari');
	});
});

describe('Excel time-series langsung', () => {
	it('meminta berkas PLTA itu dengan rentang tanggal WIB', async () => {
		const blob = new Blob(['xlsx']);
		apiRequestMock.mockResolvedValue(blob);

		const result = await httpReportsRepository.downloadTimeseriesExcel(
			'11111111-1111-4111-8111-111111111111',
			'2026-10-01',
			'2026-10-07'
		);

		const [endpoint, options] = apiRequestMock.mock.calls.at(-1)!;
		expect(endpoint).toBe(
			'/api/v1/dashboard/plta/11111111-1111-4111-8111-111111111111/timeseries.xlsx'
		);
		expect(options?.query).toEqual({ start: '2026-10-01', end: '2026-10-07' });
		expect(result).toBe(blob);
	});

	it('menolak respons yang bukan berkas', async () => {
		apiRequestMock.mockResolvedValue({ detail: 'rentang terlalu panjang' });

		await expect(
			httpReportsRepository.downloadTimeseriesExcel('plta', '2026-10-01', '2026-10-07')
		).rejects.toThrow(/time-series dari server tidak valid/);
	});
});
