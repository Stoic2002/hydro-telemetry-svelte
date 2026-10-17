import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type {
	PlantTrendData,
	PlantTrendDataInput,
	PlantTrendItem,
	PlantTrendList,
	TrendCatalog,
	TrendPoint,
	TrendSeries
} from '../model';
import {
	apiPlantTrendDataSchema,
	apiPlantTrendListSchema,
	apiTrendCatalogSchema,
	apiTrendSeriesSchema,
	type ApiPlantTrendList,
	type ApiTrendSeries
} from './schemas';
import type { TrendsRepository } from './trends-repository';

const parseResponse = createApiResponseParser('Respons server tidak sesuai kontrak data tren');

/**
 * Batas kewajaran numerik, bukan batas domain. Tidak ada besaran di dashboard ini
 * — m³/s, m, mm, MWh, % — yang secara fisik menyentuh satu triliun. Nilai sebesar
 * itu selalu berarti perhitungan di sisi server yang meledak (mis. pembagian
 * dengan angka mendekati nol), dan satu titik semacam itu cukup untuk membuat
 * seluruh sumbu Y tidak terbaca.
 */
const IMPLAUSIBLE_VALUE_THRESHOLD = 1e12;

export function isPlausibleReading(value: number): boolean {
	return Number.isFinite(value) && Math.abs(value) < IMPLAUSIBLE_VALUE_THRESHOLD;
}

function mapSeries(series: ApiTrendSeries): TrendSeries {
	const plausiblePoints = series.points.filter((point) => isPlausibleReading(point.value));

	return {
		pltaId: series.plta_id,
		parameter: series.parameter,
		station: series.station,
		resolution: series.resolution,
		aggregatedStations: series.aggregated_stations ?? [],
		points: plausiblePoints.map((point) => ({
			time: point.time,
			value: point.value,
			quality: point.quality,
			pureQuality: point.quality_murni
		})),
		discardedPoints: series.points.length - plausiblePoints.length
	};
}

function mapPoints(points: ApiTrendSeries['points']): TrendPoint[] {
	return points
		.filter((point) => isPlausibleReading(point.value))
		.map((point) => ({
			time: point.time,
			value: point.value,
			quality: point.quality,
			pureQuality: point.quality_murni
		}));
}

function mapItem(item: ApiPlantTrendList['item'][number]): PlantTrendItem {
	return {
		id: item.id,
		key: item.key,
		order: item.urutan,
		group: item.grup,
		label: item.label,
		isLabelCustom: item.label_diatur,
		unit: item.unit,
		panel: item.panel,
		source: item.sumber
	};
}

function mapCharts(charts: ApiPlantTrendList['grafik']): PlantTrendList['charts'] {
	return charts.map((chart) => ({ title: chart.judul, group: chart.grup, itemIds: chart.item }));
}

function mapList(payload: ApiPlantTrendList): PlantTrendList {
	return {
		pltaId: payload.plta_id,
		isConfigured: payload.diatur,
		items: payload.item.map(mapItem),
		charts: mapCharts(payload.grafik)
	};
}

function plantTrendPath(pltaId: string, suffix: string): string {
	return `/api/v1/trends/plta/${encodeURIComponent(pltaId)}/${suffix}`;
}

function dataQuery(input: PlantTrendDataInput) {
	return { from: input.from, to: input.to, resolution: input.resolution, item: input.itemIds };
}

const EXPORT_ACCEPT = {
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	csv: 'text/csv'
} as const;

export const httpTrendsRepository: TrendsRepository = {
	async getPlantTrendList(pltaId, options) {
		const endpoint = plantTrendPath(pltaId, 'series');
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal
		});
		return mapList(parseResponse(payload, apiPlantTrendListSchema, endpoint));
	},

	async getPlantTrendData(input, options) {
		const endpoint = plantTrendPath(input.pltaId, 'data');
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: dataQuery(input)
		});
		const data = parseResponse(payload, apiPlantTrendDataSchema, endpoint);

		return {
			pltaId: data.plta_id,
			resolution: data.resolution,
			from: data.dari,
			to: data.sampai,
			charts: mapCharts(data.grafik),
			items: data.item.map((item): PlantTrendData['items'][number] => ({
				...mapItem(item),
				effectiveResolution: item.resolusi_efektif,
				hasData: item.ada_data,
				series: item.deret.map((series) => ({
					name: series.nama,
					station: series.station,
					stations: series.stasiun,
					points: mapPoints(series.points),
					isTruncated: series.terpotong
				}))
			}))
		};
	},

	async getTrendCatalog(pltaId, options) {
		const endpoint = plantTrendPath(pltaId, 'catalog');
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal
		});
		const catalog = parseResponse(payload, apiTrendCatalogSchema, endpoint);

		return {
			pltaId: catalog.plta_id,
			unavailable: catalog.belum_ditrenkan,
			candidates: catalog.kandidat.map((candidate): TrendCatalog['candidates'][number] => ({
				key: candidate.key,
				label: candidate.label,
				unit: candidate.unit,
				panel: candidate.panel,
				source: candidate.sumber,
				kind: candidate.jenis,
				isRainfall: candidate.hujan,
				lastDataDate: candidate.data_terakhir,
				isUsed: candidate.dipakai
			}))
		};
	},

	async updatePlantTrendList(pltaId, items) {
		const endpoint = plantTrendPath(pltaId, 'series');
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'PUT',
			json: {
				item: items.map((item) => ({ key: item.key, grup: item.group, label: item.label }))
			}
		});
		return mapList(parseResponse(payload, apiPlantTrendListSchema, endpoint));
	},

	async downloadPlantTrendData(input, format) {
		const endpoint = plantTrendPath(input.pltaId, `data.${format}`);
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			headers: { Accept: EXPORT_ACCEPT[format] },
			query: dataQuery(input)
		});
		if (!(payload instanceof Blob)) {
			throw new ApiError('Berkas data tren dari server tidak valid', {
				status: 502,
				statusText: 'Invalid API Response',
				url: endpoint
			});
		}
		return payload;
	},

	async getSeries(input, options) {
		const endpoint = '/api/v1/trends';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: {
				plta_id: input.pltaId,
				parameter: input.parameter,
				from: input.from,
				to: input.to,
				resolution: input.resolution,
				station: input.station,
				agg: input.aggregation ?? 'avg'
			}
		});

		return mapSeries(parseResponse(payload, apiTrendSeriesSchema, endpoint));
	}
};
