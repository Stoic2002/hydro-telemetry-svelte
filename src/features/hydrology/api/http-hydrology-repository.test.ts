import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpHydrologyRepository } from './http-hydrology-repository';

// Hanya `apiRequest` yang diganti; parser kontrak dan schema tetap yang asli,
// karena justru itulah yang diuji di sini.
vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function pngFile() {
	return new File([new Uint8Array([1, 2, 3])], 'prakiraan.png', { type: 'image/png' });
}

describe('uploadMonthlyImage', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	/**
	 * Regresi: unggahan yang sukses sempat memunculkan toast merah.
	 *
	 * Responsnya dulu di-parse dengan `apiMonthlyHydrologySchema`, yang
	 * mensyaratkan `plta_id` — mustahil dipenuhi endpoint yang satu unggahannya
	 * berlaku untuk seluruh PLTA. Parser melempar galat kontrak 502 setelah
	 * server menjawab 2xx, jadi operator melihat kegagalan padahal berkasnya
	 * sudah tersimpan.
	 */
	it('tidak melempar walau respons bukan record bulanan', async () => {
		apiRequestMock.mockResolvedValue({ pesan: 'Gambar tersimpan', path: '/media/curah.png' });

		await expect(
			httpHydrologyRepository.uploadMonthlyImage({
				year: 2026,
				month: 9,
				kind: 'curah_hujan',
				file: pngFile()
			})
		).resolves.toBeUndefined();
	});

	it('tetap aman saat server menjawab tanpa badan respons', async () => {
		apiRequestMock.mockResolvedValue(null);

		await expect(
			httpHydrologyRepository.uploadMonthlyImage({
				year: 2026,
				month: 9,
				kind: 'sifat_hujan',
				file: pngFile()
			})
		).resolves.toBeUndefined();
	});

	it('mengirim periode, jenis, dan berkas sebagai FormData', async () => {
		apiRequestMock.mockResolvedValue({ pesan: 'ok' });

		await httpHydrologyRepository.uploadMonthlyImage({
			year: 2026,
			month: 9,
			kind: 'curah_hujan',
			file: pngFile()
		});

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/monthly/image');
		expect(options?.method).toBe('POST');

		const body = options?.body as FormData;
		expect(body.get('tahun')).toBe('2026');
		expect(body.get('bulan')).toBe('9');
		expect(body.get('jenis')).toBe('curah_hujan');
		expect(body.get('file')).toBeInstanceOf(File);
	});
});

describe('deleteMonthlyImage', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('mengirim DELETE dengan periode dan jenis sebagai query', async () => {
		apiRequestMock.mockResolvedValue({
			tahun: 2026,
			bulan: 9,
			jenis: 'sifat_hujan',
			deleted: true,
			paths: []
		});

		await expect(
			httpHydrologyRepository.deleteMonthlyImage(2026, 9, 'sifat_hujan')
		).resolves.toBeUndefined();

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/monthly/image');
		expect(options?.method).toBe('DELETE');
		expect(options?.query).toEqual({ tahun: 2026, bulan: 9, jenis: 'sifat_hujan' });
	});
});

describe('getMonthlyOverview', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	// Respons asli server untuk `?tahun=2026` (sepanjang tahun), 18 Sep 2026.
	const YEAR_OVERVIEW = {
		tahun: 2026,
		bulan: null,
		periode: '2026',
		jumlah_baris: 14,
		jumlah_plta: 13,
		prosentase_pencapaian_rata2: 104.94,
		prosentase_pencapaian_rata2_n: 14,
		prosentase_pencapaian_agregat: 92.24,
		total_prediksi_pencapaian_sd_prev_mwh: 41849.09,
		total_target_pencapaian_sd_prev_mwh: 45371.46,
		jumlah_tercapai: 4,
		jumlah_tidak_tercapai: 10,
		jumlah_belum_dinilai: 0,
		rerata: {
			prediksi_produksi_mwh: { rata2: 329.05, n: 14 },
			target_produksi_mwh: { rata2: 330.1, n: 14 },
			pencapaian_sd_prev_mwh: { rata2: 3007.67, n: 14 },
			prediksi_pencapaian_sd_prev_mwh: { rata2: 2989.22, n: 14 },
			target_pencapaian_sd_prev_mwh: { rata2: 3240.82, n: 14 }
		}
	};

	it('memetakan ringkasan armada dan meminta sepanjang tahun tanpa `bulan`', async () => {
		apiRequestMock.mockResolvedValue(YEAR_OVERVIEW);

		const overview = await httpHydrologyRepository.getMonthlyOverview(2026, undefined);

		expect(apiRequestMock.mock.calls[0][1]?.query).toEqual({ tahun: 2026, bulan: undefined });
		expect(overview.aggregateAchievementPercent).toBe(92.24);
		expect(overview.averageAchievementPercent).toEqual({ value: 104.94, count: 14 });
		expect(overview.plantCount).toBe(13);
		expect(overview.averages.targetProductionMwh).toEqual({ value: 330.1, count: 14 });
	});

	it('menerima periode tanpa data: persentase null dan hitungan nol', async () => {
		apiRequestMock.mockResolvedValue({
			...YEAR_OVERVIEW,
			bulan: 9,
			periode: '2026-09',
			jumlah_baris: 0,
			jumlah_plta: 0,
			prosentase_pencapaian_rata2: null,
			prosentase_pencapaian_rata2_n: 0,
			prosentase_pencapaian_agregat: null
		});

		const overview = await httpHydrologyRepository.getMonthlyOverview(2026, 9);

		expect(overview.rowCount).toBe(0);
		expect(overview.aggregateAchievementPercent).toBeNull();
	});
});

describe('laporan Excel hidrologi', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('meminta laporan bulanan dengan cakupan yang dipilih', async () => {
		apiRequestMock.mockResolvedValue(new Blob(['xlsx']));

		await httpHydrologyRepository.downloadMonthlyReport({ year: 2026, month: 9 });

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/monthly/report.xlsx');
		// `plta_id` kosong = seluruh PLTA; tidak boleh terkirim sebagai string kosong.
		expect(options?.query).toEqual({ tahun: 2026, bulan: 9, plta_id: undefined });
	});

	it('meminta laporan harian per panel dan per PLTA', async () => {
		apiRequestMock.mockResolvedValue(new Blob(['xlsx']));

		await httpHydrologyRepository.downloadDailyReport({
			year: 2026,
			panel: 'hulu',
			pltaId: PLTA_ID
		});

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/daily/report.xlsx');
		expect(options?.query).toEqual({
			tahun: 2026,
			bulan: undefined,
			panel: 'hulu',
			plta_id: PLTA_ID
		});
	});

	it('menolak respons yang bukan berkas', async () => {
		apiRequestMock.mockResolvedValue({ detail: 'bukan berkas' });

		await expect(httpHydrologyRepository.downloadMonthlyReport({ year: 2026 })).rejects.toThrow(
			'Respons laporan hidrologi bulanan tidak valid'
		);
	});
});

describe('Excel harian seluruh PLTA', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('meminta template untuk rentang tanggal', async () => {
		apiRequestMock.mockResolvedValue(new Blob(['xlsx']));

		await httpHydrologyRepository.downloadDailyTemplate('2026-09-01', '2026-09-30');

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/daily/template.xlsx');
		expect(options?.query).toEqual({ tanggal: '2026-09-01', sampai: '2026-09-30' });
	});

	it('memetakan hasil unggah', async () => {
		apiRequestMock.mockResolvedValue({
			baris_diproses: 390,
			titik_ditulis: 2140,
			plta: ['PLTA-SDJ', 'PLTA-WNG'],
			periode: ['2026-09-01', '2026-09-30']
		});

		const result = await httpHydrologyRepository.uploadDailyExcel(
			new File([new Uint8Array([1])], 'harian.xlsx')
		);

		expect(apiRequestMock.mock.calls[0][0]).toBe('/api/v1/hydrology/daily/excel');
		expect(result).toEqual({
			processedRows: 390,
			writtenPoints: 2140,
			pltaCodes: ['PLTA-SDJ', 'PLTA-WNG'],
			periods: ['2026-09-01', '2026-09-30']
		});
	});
});

describe('upsertMonthly', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	// Berbeda dari unggah gambar: endpoint ini memang mengembalikan satu record
	// PLTA, jadi kontraknya tetap divalidasi.
	it('memetakan respons record bulanan ke model domain', async () => {
		apiRequestMock.mockResolvedValue({
			id: '22222222-2222-4222-8222-222222222222',
			plta_id: PLTA_ID,
			tahun: 2026,
			bulan: 9,
			prediksi_hidrologi: 'Normal',
			aktual_hidrologi: null,
			image_sifat_hujan: null,
			image_curah_hujan: null,
			prediksi_produksi_mwh: 150.5,
			target_produksi_mwh: null,
			pencapaian_sd_prev_mwh: null,
			prediksi_pencapaian_sd_prev_mwh: null,
			target_pencapaian_sd_prev_mwh: null,
			prosentase_pencapaian: null
		});

		const record = await httpHydrologyRepository.upsertMonthly({
			pltaId: PLTA_ID,
			year: 2026,
			month: 9,
			predictedProductionMwh: 150.5
		});

		expect(record.pltaId).toBe(PLTA_ID);
		expect(record.predictedProductionMwh).toBe(150.5);
	});
});

describe('getDaily', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	function dashboardResponse() {
		return {
			plta: {
				id: PLTA_ID,
				code: 'PLTA-001',
				name: 'PLTA PB Soedirman (Mrica)',
				constants: { n_units: 3 },
				dmn_units: [
					{ unit: 1, dmn_mw: 59.8 },
					{ unit: 2, dmn_mw: 59.8 },
					{ unit: 3, dmn_mw: 59.8 }
				]
			},
			daily: null
		};
	}

	it('membaca daftar DMN per unit dari objek plta', async () => {
		// Daftar unit datang bersama panel harian, jadi pemilih penyebut tidak
		// perlu panggilan kedua.
		apiRequestMock.mockResolvedValue(dashboardResponse());

		const panel = await httpHydrologyRepository.getDaily(PLTA_ID);

		expect(panel.dmnUnits).toEqual([
			{ unit: 1, dmnMw: 59.8 },
			{ unit: 2, dmnMw: 59.8 },
			{ unit: 3, dmnMw: 59.8 }
		]);
	});

	it('tetap memberi daftar unit walau panel hariannya kosong', async () => {
		apiRequestMock.mockResolvedValue(dashboardResponse());

		const panel = await httpHydrologyRepository.getDaily(PLTA_ID);

		expect(panel.daily).toBeNull();
		expect(panel.dmnUnits).toHaveLength(3);
	});

	it('mengirim unit terpilih sebagai daftar dipisah koma', async () => {
		apiRequestMock.mockResolvedValue(dashboardResponse());

		await httpHydrologyRepository.getDaily(PLTA_ID, { units: [1, 2] });

		expect(apiRequestMock.mock.calls[0][1]?.query).toMatchObject({ units: '1,2' });
	});

	it('tidak mengirim units saat tidak ada unit yang dipilih', async () => {
		// Kosong berarti "seluruh unit" di server. Mengirim string kosong akan
		// dibaca sebagai daftar kosong dan penyebutnya jadi nol.
		apiRequestMock.mockResolvedValue(dashboardResponse());

		await httpHydrologyRepository.getDaily(PLTA_ID, { units: [] });

		expect(apiRequestMock.mock.calls[0][1]?.query).toMatchObject({ units: undefined });
	});

	it('meneruskan DMN manual apa adanya', async () => {
		apiRequestMock.mockResolvedValue(dashboardResponse());

		await httpHydrologyRepository.getDaily(PLTA_ID, { dmnMw: 52.5 });

		expect(apiRequestMock.mock.calls[0][1]?.query).toMatchObject({ dmn_mw: 52.5 });
	});

	it('menerima metrik penyebut yang membawa mode dan units', async () => {
		// `dmn_beban_penuh` membawa dua field yang tidak dimiliki metrik lain.
		// Sebelumnya keduanya terbuang diam-diam karena schema tidak mengenalnya.
		const response = dashboardResponse();
		apiRequestMock.mockResolvedValue({
			...response,
			daily: {
				tanggal: '2026-09-10',
				constants: null,
				hulu: {
					dmn_beban_penuh: {
						value: 59.8,
						unit: 'MW',
						label: 'DMN Beban Penuh',
						time: null,
						source: 'constant',
						stations: null,
						mode: 'unit',
						units: [2]
					}
				},
				dam: {},
				hilir: {},
				pending_formulas: []
			}
		});

		const panel = await httpHydrologyRepository.getDaily(PLTA_ID, { units: [2] });

		expect(panel.daily?.upstream.dmn_beban_penuh).toMatchObject({
			mode: 'unit',
			units: [2]
		});
	});

	it('tetap menerima PLTA lama yang belum punya dmn_units', async () => {
		apiRequestMock.mockResolvedValue({
			plta: { id: PLTA_ID, code: 'X', name: 'Y', constants: null },
			daily: null
		});

		await expect(httpHydrologyRepository.getDaily(PLTA_ID)).resolves.toMatchObject({
			dmnUnits: []
		});
	});
});
