import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type { DailyHydrology, MonthlyHydrology, MonthlyHydrologyExcelResult } from '../model';
import type { HydrologyRepository } from './hydrology-repository';
import {
	apiMonthlyHydrologyExcelResultSchema,
	apiMonthlyHydrologySchema,
	apiMonthlyHydrologyPageSchema,
	apiPLTADailyDashboardSchema,
	apiPLTAMonthlyDashboardSchema,
	type ApiDailyHydrology,
	type ApiMonthlyHydrology,
	type ApiMonthlyHydrologyExcelResult
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
