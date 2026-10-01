export type ForecastParameter = 'inflow' | 'water_level';
export type ForecastHorizon = 24 | 168;

export interface ForecastAccuracySummary {
	skill: number | null;
	sampleCount: number;
	windowDays: number;
	isPresentable: boolean;
}

export interface ForecastPoint {
	time: string;
	horizon: number;
	/** P50. `null` bila run model tidak menghasilkan nilai untuk jam itu. */
	value: number | null;
	valueP10: number | null;
	valueP90: number | null;
}

export interface ForecastSeries {
	pltaId: string;
	parameter: ForecastParameter;
	modelName: string;
	generatedAt: string | null;
	unit: string | null;
	label: string | null;
	accuracy: ForecastAccuracySummary | null;
	points: ForecastPoint[];
}

export interface ForecastQueryInput {
	pltaId: string;
	parameter: ForecastParameter;
	horizon: ForecastHorizon;
}
