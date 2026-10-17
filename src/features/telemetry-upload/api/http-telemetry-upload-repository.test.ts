import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpTelemetryUploadRepository } from './http-telemetry-upload-repository';

// Hanya `apiRequest` yang diganti; parser kontrak dan schema tetap yang asli.
vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

describe('deletePoints', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('mengirim rentang sebagai query DELETE dan memetakan jumlah titik terhapus', async () => {
		apiRequestMock.mockResolvedValue({
			plta_id: PLTA_ID,
			parameter: 'plan_outflow_spillway',
			station: 'G1',
			points_deleted: 24
		});

		await expect(
			httpTelemetryUploadRepository.deletePoints({
				pltaId: PLTA_ID,
				parameter: 'plan_outflow_spillway',
				station: 'G1',
				start: '2026-08-01T00:00:00',
				end: '2026-08-01T23:00:00'
			})
		).resolves.toEqual({
			pltaId: PLTA_ID,
			parameter: 'plan_outflow_spillway',
			station: 'G1',
			pointsDeleted: 24
		});

		expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/telemetry/points', {
			method: 'DELETE',
			query: {
				plta_id: PLTA_ID,
				parameter: 'plan_outflow_spillway',
				station: 'G1',
				start: '2026-08-01T00:00:00',
				end: '2026-08-01T23:00:00'
			}
		});
	});
});

describe('downloadTemplate', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('meminta template satu parameter dan station untuk satu bulan per hari', async () => {
		const blob = new Blob(['xlsx']);
		apiRequestMock.mockResolvedValue(blob);

		await expect(
			httpTelemetryUploadRepository.downloadTemplate({
				pltaId: PLTA_ID,
				parameter: 'plan_outflow_spillway',
				station: 'G1',
				scope: 'month-daily',
				date: '2026-10-15'
			})
		).resolves.toBe(blob);

		expect(apiRequestMock).toHaveBeenCalledWith(
			'/api/v1/telemetry/upload-template.xlsx',
			expect.objectContaining({
				method: 'GET',
				query: {
					plta_id: PLTA_ID,
					parameter: 'plan_outflow_spillway',
					station: 'G1',
					periode: 'bulanan',
					tahun: 2026,
					bulan: 10,
					resolusi: 'hari'
				}
			})
		);
	});

	it('menolak respons yang bukan berkas', async () => {
		apiRequestMock.mockResolvedValue({ detail: 'bukan berkas' });

		await expect(
			httpTelemetryUploadRepository.downloadTemplate({
				pltaId: PLTA_ID,
				parameter: 'plan_outflow_spillway',
				station: 'G1',
				scope: 'day-hourly',
				date: '2026-10-15'
			})
		).rejects.toMatchObject({ status: 502 });
	});
});
