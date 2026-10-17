export {
	createPlantTrendDataQuery,
	createPlantTrendListQuery,
	createTrendCatalogQuery,
	createTrendQuery,
	createUpdatePlantTrendListMutation
} from './api/queries';
// Dipakai monitoring untuk hujan terukur: jendela bergulir per stasiun yang
// diringkas dengan maksimum, bukan satu grafik — jadi bukan lewat query tren.
export { trendsRepository } from './api/repository';
export { getTrendErrorMessage, getTrendListErrorDetail } from './error';
export { alignTrendRange } from './model';
export { describeSeriesSource } from './series-source';
export type {
	PlantTrendChart,
	PlantTrendData,
	PlantTrendDataInput,
	PlantTrendDataItem,
	PlantTrendItem,
	PlantTrendItemInput,
	PlantTrendList,
	PlantTrendSeries,
	TrendCandidate,
	TrendCatalog,
	TrendExportFormat,
	TrendPanel,
	TrendPoint,
	TrendResolution,
	TrendSeries
} from './model';
