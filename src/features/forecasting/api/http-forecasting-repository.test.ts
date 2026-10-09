import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpForecastingRepository } from './http-forecasting-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);
const INPUT = {
	pltaId: '11111111-1111-4111-8111-111111111111',
	parameter: 'inflow' as const,
	horizon: 24 as const,
	start: '2026-09-09T03:00:00.000Z',
	end: '2026-10-09T03:00:00.000Z'
};

beforeEach(() => {
	apiRequestMock.mockReset();
});

describe('akurasi prediksi yang tersaji', () => {
	it('mengirim rentang dan memetakan metrik beserta pecahan per versi', async () => {
		apiRequestMock.mockResolvedValue({
			n: 480,
			mae: 12.4,
			rmse: 18.9,
			galat_relatif: 21.5,
			akurasi: 78.5,
			per_versi: {
				'7': { n: 400, mae: 10.1, rmse: 14.2, galat_relatif: 17.5, akurasi: 82.5 },
				fallback: { n: 80, mae: 24, rmse: 31, galat_relatif: 41.7, akurasi: 58.3 }
			}
		});

		const report = await httpForecastingRepository.getAccuracy(INPUT);

		expect(apiRequestMock.mock.calls[0][0]).toBe('/api/v1/forecasts/accuracy');
		expect(apiRequestMock.mock.calls[0][1]?.query).toEqual({
			plta_id: INPUT.pltaId,
			parameter: 'inflow',
			horizon: 24,
			start: INPUT.start,
			end: INPUT.end
		});
		expect(report).toMatchObject({ sampleCount: 480, mae: 12.4, accuracyPercent: 78.5 });
		expect(report.byVersion).toEqual([
			expect.objectContaining({ version: '7', isFallback: false, sampleCount: 400 }),
			expect.objectContaining({ version: 'fallback', isFallback: true, mae: 24 })
		]);
	});

	it('menerima respons tanpa prediksi jatuh tempo', async () => {
		apiRequestMock.mockResolvedValue({ n: 0, per_versi: {} });

		const report = await httpForecastingRepository.getAccuracy(INPUT);

		expect(report).toMatchObject({ sampleCount: 0, mae: null, accuracyPercent: null });
		expect(report.byVersion).toEqual([]);
	});
});
