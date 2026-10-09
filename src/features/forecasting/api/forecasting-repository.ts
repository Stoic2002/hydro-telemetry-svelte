import type {
	ForecastAccuracyInput,
	ForecastAccuracyReport,
	ForecastQueryInput,
	ForecastSeries
} from '../model';

export interface ForecastingRepository {
	getLatest(input: ForecastQueryInput, options?: { signal?: AbortSignal }): Promise<ForecastSeries>;
	/** Prediksi yang sudah jatuh tempo dalam rentang, dibanding realisasinya. */
	getAccuracy(
		input: ForecastAccuracyInput,
		options?: { signal?: AbortSignal }
	): Promise<ForecastAccuracyReport>;
}
