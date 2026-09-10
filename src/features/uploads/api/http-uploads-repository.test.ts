import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpUploadsRepository } from './http-uploads-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);
const PLTA_ID = '11111111-1111-4111-8111-111111111111';

describe('downloadElevationTemplate', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	/**
	 * Template EVA diambil per PLTA dan per tahun, bukan berkas statis: server
	 * mengirimkannya sudah terisi kurva yang tersimpan. Salah satu parameter
	 * hilang berarti operator menerima template kosong tanpa peringatan apa pun.
	 */
	it('meminta template untuk PLTA dan tahun yang dipilih', async () => {
		apiRequestMock.mockResolvedValue(new Blob(['x']));

		await httpUploadsRepository.downloadElevationTemplate(PLTA_ID, 2026);

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/elevations/template.xlsx');
		expect(options?.query).toEqual({ plta_id: PLTA_ID, year: 2026 });
	});

	it('menolak respons yang bukan berkas', async () => {
		// Server yang membalas JSON galat dengan status 200 tidak boleh diteruskan
		// ke `downloadBlob` — operator akan menerima berkas .xlsx yang isinya
		// pesan error.
		apiRequestMock.mockResolvedValue({ detail: 'Not found' });

		await expect(httpUploadsRepository.downloadElevationTemplate(PLTA_ID, 2026)).rejects.toThrow(
			/template kurva elevasi tidak valid/i
		);
	});

	it('meneruskan blob apa adanya', async () => {
		const blob = new Blob(['xlsx']);
		apiRequestMock.mockResolvedValue(blob);

		await expect(httpUploadsRepository.downloadElevationTemplate(PLTA_ID, 2026)).resolves.toBe(
			blob
		);
	});
});

describe('uploadElevationExcel', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('mengirim plta_id, year, publish, dan berkas sebagai FormData', async () => {
		apiRequestMock.mockResolvedValue({
			id: '22222222-2222-4222-8222-222222222222',
			plta_id: PLTA_ID,
			year: 2026,
			status: 'draft',
			min_elevation: 220,
			max_elevation: 231,
			points: [
				{ id: '33333333-3333-4333-8333-333333333333', elevation: 231, volume: 100, area: 12 }
			]
		});

		const result = await httpUploadsRepository.uploadElevationExcel({
			pltaId: PLTA_ID,
			year: 2026,
			file: new File(['x'], 'eva.xlsx'),
			publish: true
		});

		const body = apiRequestMock.mock.calls[0][1]?.body as FormData;
		expect(body.get('plta_id')).toBe(PLTA_ID);
		expect(body.get('year')).toBe('2026');
		expect(body.get('publish')).toBe('true');
		expect(body.get('file')).toBeInstanceOf(File);

		// Kontrak `ElevationPointRead` mewajibkan `area` — kolom ketiga EVA.
		expect(result.points[0]).toMatchObject({ elevation: 231, volume: 100, area: 12 });
	});
});
