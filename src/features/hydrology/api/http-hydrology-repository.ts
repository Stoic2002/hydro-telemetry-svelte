import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type {
	DailyHydrology,
	MonthlyHydrology,
	MonthlyHydrologyExcelResult,
	MonthlyHydrologyOverview,
	DailyHydrologyExcelResult
} from '../model';
import type { HydrologyRepository } from './hydrology-repository';
import {
	apiMonthlyHydrologyExcelResultSchema,
	apiMonthlyHydrologySchema,
	apiMonthlyHydrologyPageSchema,
	apiPLTADailyDashboardSchema,
	apiPLTAMonthlyDashboardSchema,
	type ApiDailyHydrology,
	type ApiMonthlyHydrology,
	type ApiMonthlyHydrologyExcelResult,
	apiDailyHydrologyExcelResultSchema,
	apiMonthlyHydrologyOverviewSchema,
	type ApiMonthlyHydrologyOverview
} from './schemas';

const parseResponse = createApiResponseParser('Respons server tidak sesuai kontrak data hidrologi');

function mapDailyHydrology(daily: ApiDailyHydrology): DailyHydrology {
	return {
		date: daily.tanggal,
		constants: daily.constants,
		upstream: daily.hulu,
		dam: daily.dam,
		downstream: daily.hilir,
		pendingFormulas: daily.pending_formulas
	};
}

function mapMonthly(item: ApiMonthlyHydrology): MonthlyHydrology {
	return {
		id: item.id,
		pltaId: item.plta_id,
		year: item.tahun,
		month: item.bulan,
		hydrologyPrediction: item.prediksi_hidrologi,
		hydrologyActual: item.aktual_hidrologi,
		rainfallCharacteristicImage: item.image_sifat_hujan,
		rainfallImage: item.image_curah_hujan,
		predictedProductionMwh: item.prediksi_produksi_mwh,
		targetProductionMwh: item.target_produksi_mwh,
		previousAchievementMwh: item.pencapaian_sd_prev_mwh,
		predictedPreviousAchievementMwh: item.prediksi_pencapaian_sd_prev_mwh,
		targetPreviousAchievementMwh: item.target_pencapaian_sd_prev_mwh,
		achievementPercentage: item.prosentase_pencapaian
	};
}

function mapExcelResult(result: ApiMonthlyHydrologyExcelResult): MonthlyHydrologyExcelResult {
	return {
		processedRows: result.baris_diproses,
		created: result.dibuat,
		updated: result.diperbarui,
		pltaCodes: result.plta ?? [],
		periods: result.periode ?? []
	};
}

function mapOverview(overview: ApiMonthlyHydrologyOverview): MonthlyHydrologyOverview {
	const average = (item: { rata2: number | null; n: number }) => ({
		value: item.rata2,
		count: item.n
	});

	return {
		year: overview.tahun,
		month: overview.bulan,
		rowCount: overview.jumlah_baris,
		plantCount: overview.jumlah_plta,
		averageAchievementPercent: {
			value: overview.prosentase_pencapaian_rata2,
			count: overview.prosentase_pencapaian_rata2_n
		},
		aggregateAchievementPercent: overview.prosentase_pencapaian_agregat,
		totalPredictedAchievementMwh: overview.total_prediksi_pencapaian_sd_prev_mwh,
		totalTargetAchievementMwh: overview.total_target_pencapaian_sd_prev_mwh,
		achievedCount: overview.jumlah_tercapai,
		notAchievedCount: overview.jumlah_tidak_tercapai,
		unassessedCount: overview.jumlah_belum_dinilai,
		averages: {
			predictedProductionMwh: average(overview.rerata.prediksi_produksi_mwh),
			targetProductionMwh: average(overview.rerata.target_produksi_mwh),
			previousAchievementMwh: average(overview.rerata.pencapaian_sd_prev_mwh),
			predictedPreviousAchievementMwh: average(overview.rerata.prediksi_pencapaian_sd_prev_mwh),
			targetPreviousAchievementMwh: average(overview.rerata.target_pencapaian_sd_prev_mwh)
		}
	};
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Endpoint laporan butuh token, jadi diunduh sebagai blob — bukan `<a href>` polos. */
async function downloadXlsx(
	endpoint: string,
	query: Record<string, string | number | undefined>,
	invalidMessage: string
): Promise<Blob> {
	const payload = await apiRequest<Blob>(endpoint, {
		method: 'GET',
		cache: 'no-store',
		headers: { Accept: XLSX_MIME },
		query
	});

	if (!(payload instanceof Blob)) {
		throw new ApiError(invalidMessage, {
			status: 502,
			statusText: 'Invalid API Response',
			url: endpoint
		});
	}

	return payload;
}

export const httpHydrologyRepository: HydrologyRepository = {
	async getDaily(pltaId, params, options) {
		const endpoint = `/api/v1/dashboard/plta/${encodeURIComponent(pltaId)}/daily`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: {
				tanggal: params?.date,
				// Server memenangkan `dmn_mw` atas `units` bila keduanya terkirim.
				// Yang tidak dipilih dibiarkan undefined supaya tidak ikut dikirim
				// sebagai string kosong.
				units: params?.units?.length ? params.units.join(',') : undefined,
				dmn_mw: params?.dmnMw
			}
		});
		const response = parseResponse(payload, apiPLTADailyDashboardSchema, endpoint);

		return {
			daily: response.daily ? mapDailyHydrology(response.daily) : null,
			dmnUnits: (response.plta.dmn_units ?? []).map((item) => ({
				unit: item.unit,
				dmnMw: item.dmn_mw
			}))
		};
	},

	async getMonthlyPanel(pltaId, year, month, options) {
		const endpoint = `/api/v1/dashboard/plta/${encodeURIComponent(pltaId)}/monthly`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: { tahun: year, bulan: month }
		});
		const response = parseResponse(payload, apiPLTAMonthlyDashboardSchema, endpoint);

		return response.monthly ? mapMonthly(response.monthly) : null;
	},

	async listMonthly(pltaId, year, options) {
		const endpoint = '/api/v1/hydrology/monthly';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: {
				plta_id: pltaId,
				tahun: year,
				page: 1,
				limit: 12
			}
		});
		const page = parseResponse(payload, apiMonthlyHydrologyPageSchema, endpoint);

		return page.items.map(mapMonthly);
	},

	async getMonthlyImage(year, month, kind, options) {
		const endpoint = '/api/v1/hydrology/monthly/image';
		const payload = await apiRequest<Blob>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			headers: { Accept: 'image/*' },
			query: {
				tahun: year,
				bulan: month,
				jenis: kind
			}
		});

		if (!(payload instanceof Blob)) {
			throw new ApiError('Respons gambar hidrologi tidak valid', {
				status: 502,
				statusText: 'Invalid API Response',
				url: endpoint
			});
		}

		return payload;
	},

	async downloadMonthlyTemplate(year, month, options) {
		const endpoint = '/api/v1/hydrology/monthly/template.xlsx';
		const payload = await apiRequest<Blob>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			headers: {
				Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			},
			query: { tahun: year, bulan: month }
		});

		if (!(payload instanceof Blob)) {
			throw new ApiError('Respons template hidrologi bulanan tidak valid', {
				status: 502,
				statusText: 'Invalid API Response',
				url: endpoint
			});
		}

		return payload;
	},

	async getMonthlyOverview(year, month, options) {
		const endpoint = '/api/v1/hydrology/monthly/overview';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: { tahun: year, bulan: month }
		});

		return mapOverview(parseResponse(payload, apiMonthlyHydrologyOverviewSchema, endpoint));
	},

	downloadDailyTemplate(from, to) {
		return downloadXlsx(
			'/api/v1/hydrology/daily/template.xlsx',
			{ tanggal: from, sampai: to },
			'Respons template hidrologi harian tidak valid'
		);
	},

	async uploadDailyExcel(file): Promise<DailyHydrologyExcelResult> {
		const endpoint = '/api/v1/hydrology/daily/excel';
		const formData = new FormData();
		formData.set('file', file);

		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			cache: 'no-store',
			body: formData
		});
		const result = parseResponse(payload, apiDailyHydrologyExcelResultSchema, endpoint);

		return {
			processedRows: result.baris_diproses,
			writtenPoints: result.titik_ditulis,
			pltaCodes: result.plta ?? [],
			periods: result.periode ?? []
		};
	},

	downloadMonthlyReport(scope) {
		return downloadXlsx(
			'/api/v1/hydrology/monthly/report.xlsx',
			{ tahun: scope.year, bulan: scope.month, plta_id: scope.pltaId },
			'Respons laporan hidrologi bulanan tidak valid'
		);
	},

	downloadDailyReport(scope) {
		return downloadXlsx(
			'/api/v1/hydrology/daily/report.xlsx',
			{ tahun: scope.year, bulan: scope.month, panel: scope.panel, plta_id: scope.pltaId },
			'Respons laporan hidrologi harian tidak valid'
		);
	},

	async uploadMonthlyExcel(file) {
		const endpoint = '/api/v1/hydrology/monthly/excel';
		const formData = new FormData();
		formData.set('file', file);

		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			cache: 'no-store',
			body: formData
		});
		const result = parseResponse(payload, apiMonthlyHydrologyExcelResultSchema, endpoint);

		return mapExcelResult(result);
	},

	async upsertMonthly(input) {
		const endpoint = '/api/v1/hydrology/monthly';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'PUT',
			json: {
				plta_id: input.pltaId,
				tahun: input.year,
				bulan: input.month,
				prediksi_hidrologi: input.hydrologyPrediction,
				aktual_hidrologi: input.hydrologyActual,
				prediksi_produksi_mwh: input.predictedProductionMwh,
				target_produksi_mwh: input.targetProductionMwh,
				pencapaian_sd_prev_mwh: input.previousAchievementMwh,
				prediksi_pencapaian_sd_prev_mwh: input.predictedPreviousAchievementMwh,
				target_pencapaian_sd_prev_mwh: input.targetPreviousAchievementMwh
			}
		});

		return mapMonthly(parseResponse(payload, apiMonthlyHydrologySchema, endpoint));
	},

	async deleteMonthlyImage(year, month, kind) {
		// Respons `{tahun, bulan, jenis, deleted, paths}` tidak dipakai: yang
		// perlu diketahui layar hanya berhasil atau tidak.
		await apiRequest<unknown>('/api/v1/hydrology/monthly/image', {
			method: 'DELETE',
			query: { tahun: year, bulan: month, jenis: kind }
		});
	},

	async uploadMonthlyImage(input) {
		const endpoint = '/api/v1/hydrology/monthly/image';
		const formData = new FormData();
		formData.set('tahun', String(input.year));
		formData.set('bulan', String(input.month));
		formData.set('jenis', input.kind);
		formData.set('file', input.file);

		// Badan respons sengaja diabaikan. Sebelumnya di-parse dengan
		// `apiMonthlyHydrologySchema`, yang mensyaratkan `plta_id` — mustahil
		// dipenuhi endpoint lintas-PLTA. Akibatnya unggahan yang sukses tetap
		// melempar galat kontrak 502 dan operator melihat toast merah.
		await apiRequest<unknown>(endpoint, {
			method: 'POST',
			body: formData
		});
	}
};
