import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpTrendsRepository } from './http-trends-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

const PLTA_ID = '11111111-1111-4111-8111-111111111111';
const RANGE = { from: '2026-10-16T00:00:00', to: '2026-10-17T00:00:00', resolution: '1h' as const };

/**
 * Halaman Tren menampilkan satu grafik, jadi hanya item grafik itu yang
 * diminta; unduhan tetap seluruh daftar.
 */
describe('data tren per PLTA', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
		apiRequestMock.mockResolvedValue(new Blob(['x']));
	});

	it('meminta hanya item grafik terpilih lewat `item`', async () => {
		await httpTrendsRepository
			.getPlantTrendData({ pltaId: PLTA_ID, ...RANGE, itemIds: ['a', 'b'] })
			.catch(() => undefined);

		expect(apiRequestMock).toHaveBeenCalledWith(
			`/api/v1/trends/plta/${PLTA_ID}/data`,
			expect.objectContaining({ query: { ...RANGE, item: ['a', 'b'] } })
		);
	});

	it('unduhan tanpa `itemIds` tidak mengirim `item`', async () => {
		await httpTrendsRepository.downloadPlantTrendData({ pltaId: PLTA_ID, ...RANGE }, 'csv');

		expect(apiRequestMock).toHaveBeenCalledWith(
			`/api/v1/trends/plta/${PLTA_ID}/data.csv`,
			expect.objectContaining({ query: { ...RANGE, item: undefined } })
		);
	});
});
