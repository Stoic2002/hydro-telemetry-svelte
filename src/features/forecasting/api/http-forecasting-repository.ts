import { apiRequest, createApiResponseParser } from '../../../api/http';
import type { ForecastAccuracyMetrics, ForecastAccuracyReport, ForecastSeries } from '../model';
import {
	apiForecastAccuracySchema,
	apiForecastSeriesSchema,
	type ApiForecastAccuracy,
	type ApiForecastSeries
} from './schemas';
import type { ForecastingRepository } from './forecasting-repository';

const parseSeries = createApiResponseParser('Respons server tidak sesuai kontrak Forecasting');

function mapSeries(series: ApiForecastSeries): ForecastSeries {
	return {
		pltaId: series.plta_id,
		parameter: series.parameter,
		modelName: series.model_name,
		generatedAt: series.generated_at,
		unit: series.unit,
		label: series.label,
		accuracy: series.akurasi
			? {
					skill: series.akurasi.skill,
					sampleCount: series.akurasi.n,
					windowDays: series.akurasi.jendela_hari,
					isPresentable: series.akurasi.layak_disajikan
				}
			: null,
		points: series.points.map((point) => ({
			time: point.time,
			horizon: point.horizon,
			value: point.value,
			valueP10: point.value_p10,
			valueP90: point.value_p90
		}))
	};
}

function mapMetrics(metrics: ApiForecastAccuracy['per_versi'][string]): ForecastAccuracyMetrics {
	return {
		sampleCount: metrics.n,
		mae: metrics.mae,
		rmse: metrics.rmse,
		relativeErrorPercent: metrics.galat_relatif,
		accuracyPercent: metrics.akurasi
	};
}

function mapAccuracy(accuracy: ApiForecastAccuracy): ForecastAccuracyReport {
	return {
		...mapMetrics(accuracy),
		byVersion: Object.entries(accuracy.per_versi).map(([version, metrics]) => ({
			version,
			isFallback: version === 'fallback',
			...mapMetrics(metrics)
		}))
	};
}

export const httpForecastingRepository: ForecastingRepository = {
	async getLatest(input, options) {
		const endpoint = '/api/v1/forecasts';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: {
				plta_id: input.pltaId,
				parameter: input.parameter,
				horizon: input.horizon
			}
		});
		return mapSeries(parseSeries(payload, apiForecastSeriesSchema, endpoint));
	},

	async getAccuracy(input, options) {
		const endpoint = '/api/v1/forecasts/accuracy';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: {
				plta_id: input.pltaId,
				parameter: input.parameter,
				horizon: input.horizon,
				start: input.start,
				end: input.end
			}
		});
		return mapAccuracy(parseSeries(payload, apiForecastAccuracySchema, endpoint));
	}
};
