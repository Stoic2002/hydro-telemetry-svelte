import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type {
	AchievementStatus,
	HydrologyPeriod,
	DailyHydrology,
	DailyVisibility,
	MonthlyFieldLabels,
	DashboardMetricGroup,
	MonthlyAccumulationChart,
	MonthlyHydrology,
	MonthlyHydrologyExcelResult,
	MonthlyHydrologyOverview,
	DailyHydrologyExcelResult,
	OverviewAchievement,
	OverviewAverageKey
} from '../model';
import type { HydrologyRepository } from './hydrology-repository';
import {
	apiDailyVisibilitySchema,
	apiMonthlyFieldLabelsSchema,
	apiMonthlyChartSchema,
	apiMonthlyHydrologyExcelResultSchema,
	apiMonthlyHydrologySchema,
	apiMonthlyHydrologyPageSchema,
	apiPLTADailyDashboardSchema,
	apiPLTAMonthlyDashboardSchema,
	type ApiDailyHydrology,
	type ApiDashboardMetricGroup,
	type ApiDailyVisibility,
	type ApiMonthlyFieldLabels,
	type ApiMonthlyChart,
	type ApiMonthlyHydrology,
	type ApiMonthlyHydrologyExcelResult,
	apiDailyHydrologyExcelResultSchema,
	apiMonthlyHydrologyOverviewSchema,
	type ApiMonthlyHydrologyOverview
} from './schemas';

const parseResponse = createApiResponseParser('Respons server tidak sesuai kontrak data hidrologi');

function mapMetricGroup(group: ApiDashboardMetricGroup): DashboardMetricGroup {
	return Object.fromEntries(
		Object.entries(group).map(([key, { urutan, ...metric }]) => [key, { ...metric, order: urutan }])
	);
}

function mapDailyHydrology(daily: ApiDailyHydrology): DailyHydrology {
	return {
		date: daily.tanggal,
		constants: daily.constants,
		upstream: mapMetricGroup(daily.hulu),
		dam: mapMetricGroup(daily.dam),
		downstream: mapMetricGroup(daily.hilir),
		pendingFormulas: daily.pending_formulas
	};
}

function mapAchievementStatus(status: 'tercapai' | 'tidak_tercapai' | null): AchievementStatus {
	if (status === null) return null;
	return status === 'tercapai' ? 'achieved' : 'not-achieved';
}

function mapMonthly(item: ApiMonthlyHydrology): MonthlyHydrology {
	return {
		id: item.id,
		pltaId: item.plta_id,
		year: item.tahun,
		month: item.bulan,
		hydrologyPrediction: item.prediksi_hidrologi,
		hydrologyActual: item.realisasi_hidrologi,
		images: {
			prediksi_sifat_hujan: item.image_prediksi_sifat_hujan,
			prediksi_curah_hujan: item.image_prediksi_curah_hujan,
			realisasi_sifat_hujan: item.image_realisasi_sifat_hujan,
			realisasi_curah_hujan: item.image_realisasi_curah_hujan
		},
		predictedProductionMwh: item.prediksi_ketersediaan_energi_primer,
		targetProductionMwh: item.target_produksi_energi_listrik,
		actualProductionMwh: item.realisasi_produksi_energi_listrik,
		predictedAccumulatedMwh: item.prediksi_akumulasi_ketersediaan_energi_primer,
		targetAccumulatedMwh: item.target_akumulasi_produksi_energi_listrik,
		actualAccumulatedMwh: item.realisasi_akumulasi_produksi_energi_listrik,
		monthlyAchievement: {
			percentage:
				item.prosentase_prediksi_ketersediaan_energi_primer_vs_target_produksi_energi_listrik,
			status: mapAchievementStatus(item.status_pencapaian_target_produksi_energi_listrik)
		},
		accumulatedAchievement: {
			percentage:
				item.prosentase_prediksi_akumulasi_ketersediaan_energi_primer_vs_target_akumulasi_produksi_energi_listrik,
			status: mapAchievementStatus(item.status_pencapaian_target_akumulasi_produksi_energi_listrik)
		}
	};
}

/** Kunci query rentang; kosong dibuang supaya server memakai aturan bawaannya. */
function periodQuery(period: HydrologyPeriod) {
	return {
		tahun: period.year,
		bulan: period.month,
		tahun_akhir: period.endYear,
		bulan_akhir: period.endMonth
	};
}

function mapChart(chart: ApiMonthlyChart): MonthlyAccumulationChart {
	return {
		pltaId: chart.plta_id,
		registeredPlantCount: chart.jumlah_plta,
		points: chart.seri.map((point) => ({
			period: point.periode,
			year: point.tahun,
			month: point.bulan,
			targetMwh: point.target_akumulasi_produksi_energi_listrik,
			actualMwh: point.realisasi_akumulasi_produksi_energi_listrik,
			targetPlantCount: point.n_target,
			actualPlantCount: point.n_realisasi,
			throughLabel: point.sd_bulan
		}))
	};
}

function mapVisibility(visibility: ApiDailyVisibility): DailyVisibility {
	return {
		pltaId: visibility.plta_id,
		hiddenCount: visibility.jumlah_tersembunyi,
		// Urutan larik = urutan efektif per panel (dijamin server); `urutan`
		// sendiri tidak dibawa supaya tidak ada dua sumber urutan.
		metrics: visibility.metrik.map(
			({ key, panel, label, hidden, urutan_diatur, label_bawaan, label_diatur }) => ({
				key,
				panel,
				label,
				hidden,
				isCustomOrder: urutan_diatur,
				defaultLabel: label_bawaan ?? label,
				isLabelCustom: label_diatur
			})
		)
	};
}

function mapMonthlyFieldLabels(labels: ApiMonthlyFieldLabels): MonthlyFieldLabels {
	return {
		customCount: labels.jumlah_diatur,
		fields: labels.bidang.map((field) => ({
			key: field.key,
			label: field.label,
			defaultLabel: field.label_bawaan,
			isCustom: field.label_diatur,
			isAccumulated: field.akumulasi,
			updatedBy: field.updated_by,
			updatedAt: field.updated_at
		}))
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

/** Kunci `rerata` di server = nama field bulanan; sisi kiri adalah kunci model. */
const OVERVIEW_AVERAGE_KEYS: Record<OverviewAverageKey, string> = {
	predictedProductionMwh: 'prediksi_ketersediaan_energi_primer',
	targetProductionMwh: 'target_produksi_energi_listrik',
	actualProductionMwh: 'realisasi_produksi_energi_listrik',
	predictedAccumulatedMwh: 'prediksi_akumulasi_ketersediaan_energi_primer',
	targetAccumulatedMwh: 'target_akumulasi_produksi_energi_listrik',
	actualAccumulatedMwh: 'realisasi_akumulasi_produksi_energi_listrik'
};

function mapOverviewAchievement(
	block: ApiMonthlyHydrologyOverview['bulanan']
): OverviewAchievement {
	return {
		averagePercent: { value: block.prosentase_rata2, count: block.prosentase_rata2_n },
		aggregatePercent: block.prosentase_agregat,
		totalPredictedMwh: block.total_prediksi,
		totalTargetMwh: block.total_target,
		achievedCount: block.jumlah_tercapai,
		notAchievedCount: block.jumlah_tidak_tercapai,
		unassessedCount: block.jumlah_belum_dinilai,
		periodStart: block.periode_awal,
		periodEnd: block.periode_akhir
	};
}

function mapOverview(overview: ApiMonthlyHydrologyOverview): MonthlyHydrologyOverview {
	const averages = Object.fromEntries(
		Object.entries(OVERVIEW_AVERAGE_KEYS).map(([key, apiKey]) => {
			const item = overview.rerata[apiKey];
			return [key, { value: item?.rata2 ?? null, count: item?.n ?? 0 }];
		})
	) as MonthlyHydrologyOverview['averages'];

	return {
		year: overview.tahun,
		month: overview.bulan,
		rowCount: overview.jumlah_baris,
		plantCount: overview.jumlah_plta,
		monthly: mapOverviewAchievement(overview.bulanan),
		accumulated: mapOverviewAchievement(overview.akumulasi),
		averages
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

	async getDailyVisibility(pltaId, options) {
		const endpoint = `/api/v1/dashboard/plta/${encodeURIComponent(pltaId)}/daily/visibility`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal
		});

		return mapVisibility(parseResponse(payload, apiDailyVisibilitySchema, endpoint));
	},

	async setDailyVisibility(pltaId, changes) {
		const endpoint = `/api/v1/dashboard/plta/${encodeURIComponent(pltaId)}/daily/visibility`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'PUT',
			// Bagian yang kosong tidak dikirim: keduanya opsional di server, dan
			// `urutan: {}` tidak perlu ikut dicatat sebagai perubahan.
			json: {
				...(changes.hidden && Object.keys(changes.hidden).length > 0
					? { metrik: changes.hidden }
					: {}),
				...(changes.order && Object.keys(changes.order).length > 0 ? { urutan: changes.order } : {})
			}
		});

		return mapVisibility(parseResponse(payload, apiDailyVisibilitySchema, endpoint));
	},

	async setDailyLabels(pltaId, labels) {
		const endpoint = `/api/v1/dashboard/plta/${encodeURIComponent(pltaId)}/daily/labels`;
		const payload = await apiRequest<unknown>(endpoint, { method: 'PUT', json: { label: labels } });

		return mapVisibility(parseResponse(payload, apiDailyVisibilitySchema, endpoint));
	},

	async getMonthlyFieldLabels(options) {
		const endpoint = '/api/v1/hydrology/monthly/labels';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal
		});

		return mapMonthlyFieldLabels(parseResponse(payload, apiMonthlyFieldLabelsSchema, endpoint));
	},

	async setMonthlyFieldLabels(labels) {
		const endpoint = '/api/v1/hydrology/monthly/labels';
		const payload = await apiRequest<unknown>(endpoint, { method: 'PUT', json: { label: labels } });

		return mapMonthlyFieldLabels(parseResponse(payload, apiMonthlyFieldLabelsSchema, endpoint));
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

	async getMonthlyOverview(period, options) {
		const endpoint = '/api/v1/hydrology/monthly/overview';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: periodQuery(period)
		});

		return mapOverview(parseResponse(payload, apiMonthlyHydrologyOverviewSchema, endpoint));
	},

	async getMonthlyChart(period, pltaId, options) {
		const endpoint = '/api/v1/hydrology/monthly/chart';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: { ...periodQuery(period), plta_id: pltaId }
		});

		return mapChart(parseResponse(payload, apiMonthlyChartSchema, endpoint));
	},

	downloadDailyTemplate(from, to, options) {
		return downloadXlsx(
			'/api/v1/hydrology/daily/template.xlsx',
			{ tanggal: from, sampai: to, per_jam: options?.perHour ? 'true' : undefined },
			'Respons template hidrologi harian tidak valid'
		);
	},

	async uploadDailyExcel(file, options): Promise<DailyHydrologyExcelResult> {
		const endpoint = '/api/v1/hydrology/daily/excel';
		const formData = new FormData();
		formData.set('file', file);
		// Bawaan server `lewati`; hanya dikirim bila operator memilih mewarisi.
		if (options?.emptyCells === 'carry-forward') formData.set('isi_kosong', 'bawa_terakhir');

		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			cache: 'no-store',
			body: formData
		});
		const result = parseResponse(payload, apiDailyHydrologyExcelResultSchema, endpoint);

		return {
			processedRows: result.baris_diproses,
			writtenPoints: result.titik_ditulis,
			inheritedPoints: result.titik_diwarisi,
			pltaCodes: result.plta ?? [],
			periods: result.periode ?? []
		};
	},

	downloadMonthlyReport(scope) {
		return downloadXlsx(
			'/api/v1/hydrology/monthly/report.xlsx',
			{
				...periodQuery({
					year: scope.year,
					month: scope.month,
					endYear: scope.endYear,
					endMonth: scope.endMonth
				}),
				plta_id: scope.pltaId
			},
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
				realisasi_hidrologi: input.hydrologyActual,
				prediksi_ketersediaan_energi_primer: input.predictedProductionMwh,
				target_produksi_energi_listrik: input.targetProductionMwh,
				realisasi_produksi_energi_listrik: input.actualProductionMwh,
				prediksi_akumulasi_ketersediaan_energi_primer: input.predictedAccumulatedMwh,
				target_akumulasi_produksi_energi_listrik: input.targetAccumulatedMwh,
				realisasi_akumulasi_produksi_energi_listrik: input.actualAccumulatedMwh
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
