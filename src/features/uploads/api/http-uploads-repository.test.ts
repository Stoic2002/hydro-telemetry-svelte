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

describe('status dan pengelolaan kurva EVA', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	const CURVE_ID = '44444444-4444-4444-8444-444444444444';
	const OTHER_PLTA = '55555555-5555-4555-8555-555555555555';

	it('memetakan tiga status kesiapan, bukan satu boolean', async () => {
		apiRequestMock.mockResolvedValue({
			tahun: 2026,
			ringkasan: { total_plta: 3, siap: 1, draft: 1, belum_ada: 1 },
			items: [
				{
					plta_id: PLTA_ID,
					kode_plta: 'PLTA-001',
					nama_plta: 'PB Soedirman',
					status: 'siap',
					tersedia: true,
					tahun_berlaku: 2024,
					jumlah_titik: 1200,
					elevasi_min: 220,
					elevasi_maks: 231.5,
					tahun_published: [2024, 2020],
					tahun_draft: [2026]
				},
				{
					plta_id: OTHER_PLTA,
					kode_plta: 'PLTA-002',
					nama_plta: 'Wonogiri',
					status: 'draft',
					tersedia: false,
					tahun_berlaku: null,
					jumlah_titik: null,
					elevasi_min: null,
					elevasi_maks: null,
					tahun_published: [],
					tahun_draft: [2026]
				}
			]
		});

		const status = await httpUploadsRepository.getElevationStatus(2026);

		expect(apiRequestMock.mock.calls[0][0]).toBe('/api/v1/elevations/status');
		expect(apiRequestMock.mock.calls[0][1]?.query).toEqual({ year: 2026 });
		expect(status.totals).toEqual({ plants: 3, ready: 1, draft: 1, missing: 1 });
		// Kurva 2024 masih berlaku di 2026: `effectiveYear` menyebutnya.
		expect(status.plants[0]).toMatchObject({ readiness: 'ready', effectiveYear: 2024 });
		expect(status.plants[1]).toMatchObject({ readiness: 'draft', draftYears: [2026] });
	});

	it('memetakan daftar kurva beserta penanda berlaku dan kembarannya', async () => {
		apiRequestMock.mockResolvedValue({
			tahun: 2026,
			total: 1,
			items: [
				{
					id: CURVE_ID,
					plta_id: PLTA_ID,
					kode_plta: 'PLTA-001',
					nama_plta: 'PB Soedirman',
					tahun: 2026,
					status: 'draft',
					jumlah_titik: 1200,
					elevasi_min: 220,
					elevasi_maks: 231.5,
					berlaku: false,
					kembar: [
						{
							id: '66666666-6666-4666-8666-666666666666',
							plta_id: OTHER_PLTA,
							kode_plta: 'PLTA-009',
							nama_plta: 'Jelok',
							tahun: 2025,
							status: 'published'
						}
					]
				}
			]
		});

		const curves = await httpUploadsRepository.listElevationCurves({ pltaId: PLTA_ID, year: 2026 });

		expect(apiRequestMock.mock.calls[0][0]).toBe('/api/v1/elevations/curves');
		expect(apiRequestMock.mock.calls[0][1]?.query).toEqual({ plta_id: PLTA_ID, year: 2026 });
		expect(curves[0]).toMatchObject({ id: CURVE_ID, status: 'draft', isEffective: false });
		expect(curves[0].twins[0]).toMatchObject({ plantName: 'Jelok', status: 'published' });
	});

	it('mengubah status lewat PATCH dengan badan `{status}`', async () => {
		apiRequestMock.mockResolvedValue({});

		await httpUploadsRepository.setElevationCurveStatus(CURVE_ID, 'published');

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe(`/api/v1/elevations/${CURVE_ID}/status`);
		expect(options?.method).toBe('PATCH');
		expect(options?.json).toEqual({ status: 'published' });
	});

	it('menghapus kurva lewat DELETE', async () => {
		apiRequestMock.mockResolvedValue({ deleted: true });

		await httpUploadsRepository.deleteElevationCurve(CURVE_ID);

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe(`/api/v1/elevations/${CURVE_ID}`);
		expect(options?.method).toBe('DELETE');
	});

	it('menolak status kesiapan yang tidak dikenal sebagai galat kontrak', async () => {
		apiRequestMock.mockResolvedValue({
			tahun: 2026,
			ringkasan: { total_plta: 1, siap: 0, draft: 0, belum_ada: 0 },
			items: [
				{
					plta_id: PLTA_ID,
					kode_plta: 'X',
					nama_plta: 'Y',
					status: 'tersedia',
					tersedia: true,
					tahun_berlaku: null,
					jumlah_titik: null,
					elevasi_min: null,
					elevasi_maks: null,
					tahun_published: [],
					tahun_draft: []
				}
			]
		});

		await expect(httpUploadsRepository.getElevationStatus(2026)).rejects.toThrow();
	});
});
