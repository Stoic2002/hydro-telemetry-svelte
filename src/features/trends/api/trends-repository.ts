import type {
	PlantTrendData,
	PlantTrendDataInput,
	PlantTrendItemInput,
	PlantTrendList,
	TrendCatalog,
	TrendExportFormat,
	TrendQueryInput,
	TrendSeries
} from '../model';

export interface TrendRequestOptions {
	signal?: AbortSignal;
}

export interface TrendsRepository {
	getSeries(input: TrendQueryInput, options?: TrendRequestOptions): Promise<TrendSeries>;
	getPlantTrendList(pltaId: string, options?: TrendRequestOptions): Promise<PlantTrendList>;
	getPlantTrendData(
		input: PlantTrendDataInput,
		options?: TrendRequestOptions
	): Promise<PlantTrendData>;
	getTrendCatalog(pltaId: string, options?: TrendRequestOptions): Promise<TrendCatalog>;
	/** Mengganti SELURUH daftar; item yang tidak dikirim dihapus. */
	updatePlantTrendList(pltaId: string, items: PlantTrendItemInput[]): Promise<PlantTrendList>;
	downloadPlantTrendData(input: PlantTrendDataInput, format: TrendExportFormat): Promise<Blob>;
}
