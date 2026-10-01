import type { ForecastQueryInput, ForecastSeries } from '../model';

export interface ForecastingRepository {
	getLatest(input: ForecastQueryInput, options?: { signal?: AbortSignal }): Promise<ForecastSeries>;
}
