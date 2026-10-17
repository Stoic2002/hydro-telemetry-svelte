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
				kind: 'prediksi_curah_hujan',
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
				kind: 'prediksi_sifat_hujan',
				file: pngFile()
			})
		).resolves.toBeUndefined();
	});

	it('mengirim periode, jenis, dan berkas sebagai FormData', async () => {
		apiRequestMock.mockResolvedValue({ pesan: 'ok' });

		await httpHydrologyRepository.uploadMonthlyImage({
			year: 2026,
			month: 9,
			kind: 'prediksi_curah_hujan',
			file: pngFile()
		});

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/monthly/image');
		expect(options?.method).toBe('POST');

		const body = options?.body as FormData;
		expect(body.get('tahun')).toBe('2026');
		expect(body.get('bulan')).toBe('9');
		expect(body.get('jenis')).toBe('prediksi_curah_hujan');
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
			jenis: 'prediksi_sifat_hujan',
			deleted: true,
			paths: []
		});

		await expect(
			httpHydrologyRepository.deleteMonthlyImage(2026, 9, 'prediksi_sifat_hujan')
		).resolves.toBeUndefined();

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/hydrology/monthly/image');
		expect(options?.method).toBe('DELETE');
		expect(options?.query).toEqual({ tahun: 2026, bulan: 9, jenis: 'prediksi_sifat_hujan' });
	});
});

describe('getMonthlyOverview', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	// Bentuk respons mengikuti Swagger 5 Okt 2026 (dua blok pencapaian);
	// angkanya dari data tahunan 18 Sep 2026.
	const YEAR_OVERVIEW = {
		tahun: 2026,
		bulan: null,
		periode: '2026',
		jumlah_baris: 14,
		jumlah_plta: 13,
		bulanan: {
			prediksi: 'prediksi_ketersediaan_energi_primer',
			target: 'target_produksi_energi_listrik',
			prosentase_rata2: 99.1,
			prosentase_rata2_n: 14,
			prosentase_agregat: 98.5,
			total_prediksi: 4606.7,
			total_target: 4675.4,
			jumlah_tercapai: 6,
			jumlah_tidak_tercapai: 8,
			jumlah_belum_dinilai: 0
		},
		akumulasi: {
			prediksi: 'prediksi_akumulasi_ketersediaan_energi_primer',
			target: 'target_akumulasi_produksi_energi_listrik',
			prosentase_rata2: 104.94,
			prosentase_rata2_n: 14,
			prosentase_agregat: 92.24,
			total_prediksi: 41849.09,
			total_target: 45371.46,
			jumlah_tercapai: 4,
			jumlah_tidak_tercapai: 10,
			jumlah_belum_dinilai: 0
		},
		rerata: {
			prediksi_ketersediaan_energi_primer: { rata2: 329.05, n: 14 },
			target_produksi_energi_listrik: { rata2: 330.1, n: 14 },
			realisasi_produksi_energi_listrik: { rata2: 301.2, n: 12 },
			prediksi_akumulasi_ketersediaan_energi_primer: { rata2: 2989.22, n: 14 },
			target_akumulasi_produksi_energi_listrik: { rata2: 3240.82, n: 14 },
			realisasi_akumulasi_produksi_energi_listrik: { rata2: 3007.67, n: 14 }
		}
	};

	it('memetakan ringkasan seluruh PLTA dan meminta sepanjang tahun tanpa `bulan`', async () => {
		apiRequestMock.mockResolvedValue(YEAR_OVERVIEW);

		const overview = await httpHydrologyRepository.getMonthlyOverview({ year: 2026 });

		expect(apiRequestMock.mock.calls[0][1]?.query).toEqual({ tahun: 2026, bulan: undefined });
		expect(overview.accumulated.aggregatePercent).toBe(92.24);
		expect(overview.accumulated.averagePercent).toEqual({ value: 104.94, count: 14 });
		expect(overview.accumulated.totalPredictedMwh).toBe(41849.09);
		expect(overview.monthly.aggregatePercent).toBe(98.5);
		expect(overview.monthly.achievedCount).toBe(6);
		expect(overview.plantCount).toBe(13);
		expect(overview.averages.targetProductionMwh).toEqual({ value: 330.1, count: 14 });
		expect(overview.averages.actualProductionMwh).toEqual({ value: 301.2, count: 12 });
		expect(overview.averages.actualAccumulatedMwh).toEqual({ value: 3007.67, count: 14 });
	});

	it('menerima periode tanpa data: persentase null dan hitungan nol', async () => {
		const empty = {
			...YEAR_OVERVIEW.akumulasi,
			prosentase_rata2: null,
			prosentase_rata2_n: 0,
			prosentase_agregat: null
		};
		apiRequestMock.mockResolvedValue({
			...YEAR_OVERVIEW,
			bulan: 9,
			periode: '2026-09',
			jumlah_baris: 0,
			jumlah_plta: 0,
			bulanan: empty,
			akumulasi: empty
		});

		const overview = await httpHydrologyRepository.getMonthlyOverview({ year: 2026, month: 9 });

		expect(overview.rowCount).toBe(0);
		expect(overview.accumulated.aggregatePercent).toBeNull();
	});

	it('membawa bulan yang dirangkum tiap blok; akumulasi = satu bulan terakhir berdata', async () => {
		apiRequestMock.mockResolvedValue({
			...YEAR_OVERVIEW,
			bulanan: { ...YEAR_OVERVIEW.bulanan, periode_awal: '2026-01', periode_akhir: '2026-09' },
			akumulasi: { ...YEAR_OVERVIEW.akumulasi, periode_awal: '2026-09', periode_akhir: '2026-09' }
		});

		const overview = await httpHydrologyRepository.getMonthlyOverview({ year: 2026 });

		expect(overview.monthly).toMatchObject({ periodStart: '2026-01', periodEnd: '2026-09' });
		expect(overview.accumulated).toMatchObject({ periodStart: '2026-09', periodEnd: '2026-09' });
	});

	it('bulan blok tidak diketahui bila backend lama tidak mengirimnya', async () => {
		apiRequestMock.mockResolvedValue(YEAR_OVERVIEW);

		const overview = await httpHydrologyRepository.getMonthlyOverview({ year: 2026 });

		expect(overview.accumulated.periodEnd).toBeNull();
	});

	it('menganggap kunci `rerata` yang tidak dikirim sebagai tidak ada data', async () => {
		apiRequestMock.mockResolvedValue({ ...YEAR_OVERVIEW, rerata: {} });

		const overview = await httpHydrologyRepository.getMonthlyOverview({ year: 2026 });

		expect(overview.averages.targetProductionMwh).toEqual({ value: null, count: 0 });
	});

	it('menolak bentuk respons lama sebagai galat kontrak, bukan diam-diam kosong', async () => {
		apiRequestMock.mockResolvedValue({
			tahun: 2026,
			bulan: null,
			periode: '2026',
			jumlah_baris: 14,
			jumlah_plta: 13,
			prosentase_pencapaian_agregat: 92.24,
			rerata: {}
		});

		await expect(httpHydrologyRepository.getMonthlyOverview({ year: 2026 })).rejects.toThrow();
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

	it('meminta template per jam hanya bila dipilih', async () => {
		apiRequestMock.mockResolvedValue(new Blob(['xlsx']));

		await httpHydrologyRepository.downloadDailyTemplate('2026-09-01', undefined, { perHour: true });
		await httpHydrologyRepository.downloadDailyTemplate('2026-09-01');

		expect(apiRequestMock.mock.calls[0][1]?.query).toMatchObject({ per_jam: 'true' });
		expect(apiRequestMock.mock.calls[1][1]?.query?.per_jam).toBeUndefined();
	});

	it('mengirim `isi_kosong` hanya saat memilih mewarisi nilai terakhir', async () => {
		apiRequestMock.mockResolvedValue({
			baris_diproses: 1,
			titik_ditulis: 5,
			titik_diwarisi: 2,
			plta: [],
			periode: []
		});
		const file = new File([new Uint8Array([1])], 'harian.xlsx');

		const inherited = await httpHydrologyRepository.uploadDailyExcel(file, {
			emptyCells: 'carry-forward'
		});
		await httpHydrologyRepository.uploadDailyExcel(file, { emptyCells: 'skip' });
		await httpHydrologyRepository.uploadDailyExcel(file);

		const bodyOf = (call: number) => apiRequestMock.mock.calls[call][1]?.body as FormData;
		expect(bodyOf(0).get('isi_kosong')).toBe('bawa_terakhir');
		expect(bodyOf(1).has('isi_kosong')).toBe(false);
		expect(bodyOf(2).has('isi_kosong')).toBe(false);
		expect(inherited.inheritedPoints).toBe(2);
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
			periods: ['2026-09-01', '2026-09-30'],
			inheritedPoints: 0
		});
	});
});

describe('upsertMonthly', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	// Berbeda dari unggah gambar: endpoint ini memang mengembalikan satu record
	// PLTA, jadi kontraknya tetap divalidasi.
	function monthlyResponse(patch: Record<string, unknown> = {}) {
		return {
			id: '22222222-2222-4222-8222-222222222222',
			plta_id: PLTA_ID,
			tahun: 2026,
			bulan: 9,
			prediksi_hidrologi: 'Normal',
			realisasi_hidrologi: null,
			image_prediksi_sifat_hujan: null,
			image_prediksi_curah_hujan: 'bmkg/2026-09-prediksi-curah.png',
			image_realisasi_sifat_hujan: null,
			image_realisasi_curah_hujan: null,
			prediksi_ketersediaan_energi_primer: 150.5,
			target_produksi_energi_listrik: 160,
			realisasi_produksi_energi_listrik: 142.25,
			prediksi_akumulasi_ketersediaan_energi_primer: 1200,
			target_akumulasi_produksi_energi_listrik: 1300,
			realisasi_akumulasi_produksi_energi_listrik: null,
			prosentase_prediksi_ketersediaan_energi_primer_vs_target_produksi_energi_listrik: 94.06,
			status_pencapaian_target_produksi_energi_listrik: 'tidak_tercapai',
			prosentase_prediksi_akumulasi_ketersediaan_energi_primer_vs_target_akumulasi_produksi_energi_listrik: 102.5,
			status_pencapaian_target_akumulasi_produksi_energi_listrik: 'tercapai',
			...patch
		};
	}

	it('memetakan respons record bulanan ke model domain', async () => {
		apiRequestMock.mockResolvedValue(monthlyResponse());

		const record = await httpHydrologyRepository.upsertMonthly({
			pltaId: PLTA_ID,
			year: 2026,
			month: 9,
			predictedProductionMwh: 150.5
		});

		expect(record.pltaId).toBe(PLTA_ID);
		expect(record.hydrologyPrediction).toBe('Normal');
		expect(record.predictedProductionMwh).toBe(150.5);
		expect(record.targetProductionMwh).toBe(160);
		expect(record.actualProductionMwh).toBe(142.25);
		expect(record.predictedAccumulatedMwh).toBe(1200);
		expect(record.targetAccumulatedMwh).toBe(1300);
		expect(record.actualAccumulatedMwh).toBeNull();
		expect(record.images.prediksi_curah_hujan).toBe('bmkg/2026-09-prediksi-curah.png');
		expect(record.images.realisasi_curah_hujan).toBeNull();
	});

	it('memetakan dua pasangan persentase beserta statusnya', async () => {
		apiRequestMock.mockResolvedValue(monthlyResponse());

		const record = await httpHydrologyRepository.upsertMonthly({
			pltaId: PLTA_ID,
			year: 2026,
			month: 9
		});

		expect(record.monthlyAchievement).toEqual({ percentage: 94.06, status: 'not-achieved' });
		expect(record.accumulatedAchievement).toEqual({ percentage: 102.5, status: 'achieved' });
	});

	it('mengirim nama field baru dan tidak lagi mengirim nama lama', async () => {
		apiRequestMock.mockResolvedValue(monthlyResponse());

		await httpHydrologyRepository.upsertMonthly({
			pltaId: PLTA_ID,
			year: 2026,
			month: 9,
			hydrologyActual: 'Basah',
			predictedProductionMwh: 1,
			targetProductionMwh: 2,
			actualProductionMwh: 3,
			predictedAccumulatedMwh: 4,
			targetAccumulatedMwh: 5,
			actualAccumulatedMwh: 6
		});

		expect(apiRequestMock.mock.calls[0][1]?.json).toEqual({
			plta_id: PLTA_ID,
			tahun: 2026,
			bulan: 9,
			prediksi_hidrologi: undefined,
			realisasi_hidrologi: 'Basah',
			prediksi_ketersediaan_energi_primer: 1,
			target_produksi_energi_listrik: 2,
			realisasi_produksi_energi_listrik: 3,
			prediksi_akumulasi_ketersediaan_energi_primer: 4,
			target_akumulasi_produksi_energi_listrik: 5,
			realisasi_akumulasi_produksi_energi_listrik: 6
		});
	});

	it('menolak respons yang masih memakai nama field lama', async () => {
		apiRequestMock.mockResolvedValue({
			id: '22222222-2222-4222-8222-222222222222',
			plta_id: PLTA_ID,
			tahun: 2026,
			bulan: 9,
			prediksi_hidrologi: 'Normal',
			aktual_hidrologi: null,
			prediksi_produksi_mwh: 150.5,
			target_produksi_mwh: null,
			prosentase_pencapaian: null
		});

		await expect(
			httpHydrologyRepository.upsertMonthly({ pltaId: PLTA_ID, year: 2026, month: 9 })
		).rejects.toThrow();
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

	it('membawa penanda `hidden` per metrik, dan menganggap yang tidak ada sebagai tampil', async () => {
		const metric = {
			value: 7.1,
			unit: null,
			label: 'pH',
			time: null,
			source: 'measured',
			stations: null
		};
		apiRequestMock.mockResolvedValue({
			...dashboardResponse(),
			daily: {
				tanggal: '2026-09-10',
				constants: null,
				hulu: { ph_hulu: { ...metric, hidden: true }, ph_intake: metric },
				dam: {},
				hilir: {},
				pending_formulas: []
			}
		});

		const panel = await httpHydrologyRepository.getDaily(PLTA_ID);

		expect(panel.daily?.upstream.ph_hulu.hidden).toBe(true);
		expect(panel.daily?.upstream.ph_intake.hidden).toBe(false);
	});

	it('membawa urutan metrik dari server, dan null bila tidak dikirim', async () => {
		const metric = {
			value: 7,
			unit: null,
			label: 'pH',
			time: null,
			source: 'measured',
			stations: null
		};
		apiRequestMock.mockResolvedValue({
			...dashboardResponse(),
			daily: {
				tanggal: '2026-10-06',
				constants: null,
				hulu: { ph_hulu: { ...metric, urutan: 3 }, ph_intake: metric },
				dam: {},
				hilir: {},
				pending_formulas: []
			}
		});

		const panel = await httpHydrologyRepository.getDaily(PLTA_ID);

		expect(panel.daily?.upstream.ph_hulu.order).toBe(3);
		expect(panel.daily?.upstream.ph_intake.order).toBeNull();
		expect(panel.daily?.upstream.ph_hulu).not.toHaveProperty('urutan');
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

describe('visibilitas metrik harian', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	const VISIBILITY = {
		plta_id: PLTA_ID,
		jumlah_tersembunyi: 1,
		metrik: [
			{
				key: 'tma_waduk',
				panel: 'hulu',
				label: 'TMA Waduk',
				hidden: false,
				urutan: 0,
				urutan_diatur: false,
				updated_by: null,
				updated_at: null
			},
			{
				key: 'ph_hulu',
				panel: 'hulu',
				label: 'pH Hulu',
				hidden: true,
				urutan: 1,
				urutan_diatur: true,
				updated_by: '33333333-3333-4333-8333-333333333333',
				updated_at: '2026-10-05T03:00:00Z'
			}
		]
	};

	it('memetakan daftar metrik beserta status sembunyinya', async () => {
		apiRequestMock.mockResolvedValue(VISIBILITY);

		const visibility = await httpHydrologyRepository.getDailyVisibility(PLTA_ID);

		expect(apiRequestMock.mock.calls[0][0]).toBe(
			`/api/v1/dashboard/plta/${PLTA_ID}/daily/visibility`
		);
		expect(visibility.hiddenCount).toBe(1);
		expect(visibility.metrics).toEqual([
			{
				key: 'tma_waduk',
				panel: 'hulu',
				label: 'TMA Waduk',
				hidden: false,
				isCustomOrder: false,
				// Server lama tanpa `label_bawaan`: nama bawaan = nama yang berlaku.
				defaultLabel: 'TMA Waduk',
				isLabelCustom: false
			},
			{
				key: 'ph_hulu',
				panel: 'hulu',
				label: 'pH Hulu',
				hidden: true,
				isCustomOrder: true,
				defaultLabel: 'pH Hulu',
				isLabelCustom: false
			}
		]);
	});

	it('mengirim ganti nama metrik dalam kunci `label`', async () => {
		apiRequestMock.mockResolvedValue(VISIBILITY);

		await httpHydrologyRepository.setDailyLabels(PLTA_ID, { tma_waduk: 'Elevasi', ph_hulu: null });

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe(`/api/v1/dashboard/plta/${PLTA_ID}/daily/labels`);
		expect(options?.method).toBe('PUT');
		expect(options?.json).toEqual({ label: { tma_waduk: 'Elevasi', ph_hulu: null } });
	});

	it('mengirim perubahan sembunyi parsial dalam kunci `metrik`', async () => {
		apiRequestMock.mockResolvedValue(VISIBILITY);

		await httpHydrologyRepository.setDailyVisibility(PLTA_ID, { hidden: { ph_hulu: true } });

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe(`/api/v1/dashboard/plta/${PLTA_ID}/daily/visibility`);
		expect(options?.method).toBe('PUT');
		expect(options?.json).toEqual({ metrik: { ph_hulu: true } });
	});

	it('mengirim urutan per panel dalam kunci `urutan`, termasuk [] untuk kembali ke bawaan', async () => {
		apiRequestMock.mockResolvedValue(VISIBILITY);

		await httpHydrologyRepository.setDailyVisibility(PLTA_ID, {
			hidden: {},
			order: { hulu: ['ph_hulu', 'tma_waduk'], dam: [] }
		});

		expect(apiRequestMock.mock.calls[0][1]?.json).toEqual({
			urutan: { hulu: ['ph_hulu', 'tma_waduk'], dam: [] }
		});
	});

	it('tetap menerima backend yang belum mengirim urutan', async () => {
		apiRequestMock.mockResolvedValue({
			...VISIBILITY,
			metrik: [{ key: 'tma_waduk', panel: 'hulu', label: 'TMA Waduk', hidden: false }]
		});

		const visibility = await httpHydrologyRepository.getDailyVisibility(PLTA_ID);

		expect(visibility.metrics[0].isCustomOrder).toBe(false);
	});

	it('menolak nama panel yang tidak dikenal', async () => {
		apiRequestMock.mockResolvedValue({
			...VISIBILITY,
			metrik: [{ key: 'x', panel: 'bulanan', label: 'X', hidden: false }]
		});

		await expect(httpHydrologyRepository.getDailyVisibility(PLTA_ID)).rejects.toThrow();
	});
});

describe('rentang periode', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	it('meneruskan akhir rentang ke overview dan laporan bulanan', async () => {
		apiRequestMock.mockResolvedValue(new Blob(['xlsx']));

		await httpHydrologyRepository.downloadMonthlyReport({
			year: 2026,
			month: 1,
			endYear: 2026,
			endMonth: 9,
			pltaId: PLTA_ID
		});

		expect(apiRequestMock.mock.calls[0][1]?.query).toEqual({
			tahun: 2026,
			bulan: 1,
			tahun_akhir: 2026,
			bulan_akhir: 9,
			plta_id: PLTA_ID
		});
	});
});

describe('getMonthlyChart', () => {
	beforeEach(() => {
		apiRequestMock.mockReset();
	});

	const CHART = {
		plta_id: PLTA_ID,
		periode_awal: '2026-01',
		periode_akhir: '2026-03',
		jumlah_plta: 13,
		seri: [
			{
				periode: '2026-01',
				tahun: 2026,
				bulan: 1,
				target_akumulasi_produksi_energi_listrik: 1000,
				realisasi_akumulasi_produksi_energi_listrik: 950.5,
				n_target: 1,
				n_realisasi: 1,
				sd_bulan: 's.d. Bulan Januari 2026'
			},
			{
				periode: '2026-02',
				tahun: 2026,
				bulan: 2,
				target_akumulasi_produksi_energi_listrik: 2000,
				realisasi_akumulasi_produksi_energi_listrik: null,
				n_target: 1,
				n_realisasi: 0
			}
		]
	};

	it('memetakan deret per bulan dan mempertahankan null sebagai null', async () => {
		apiRequestMock.mockResolvedValue(CHART);

		const chart = await httpHydrologyRepository.getMonthlyChart({ year: 2026 }, PLTA_ID);

		expect(apiRequestMock.mock.calls[0][0]).toBe('/api/v1/hydrology/monthly/chart');
		expect(apiRequestMock.mock.calls[0][1]?.query).toMatchObject({ tahun: 2026, plta_id: PLTA_ID });
		expect(chart.registeredPlantCount).toBe(13);
		expect(chart.points[0]).toEqual({
			period: '2026-01',
			year: 2026,
			month: 1,
			targetMwh: 1000,
			actualMwh: 950.5,
			targetPlantCount: 1,
			actualPlantCount: 1,
			throughLabel: 's.d. Bulan Januari 2026'
		});
		// Titik tanpa `sd_bulan` (backend lama) tetap terbaca.
		expect(chart.points[1].throughLabel).toBeNull();
		// Bulan kosong harus tetap null — bukan 0 — supaya garisnya terputus.
		expect(chart.points[1].actualMwh).toBeNull();
	});

	it('tidak mengirim plta_id untuk jumlah seluruh PLTA', async () => {
		apiRequestMock.mockResolvedValue({ ...CHART, plta_id: null });

		const chart = await httpHydrologyRepository.getMonthlyChart({ year: 2026 });

		expect(apiRequestMock.mock.calls[0][1]?.query?.plta_id).toBeUndefined();
		expect(chart.pltaId).toBeNull();
	});
});
