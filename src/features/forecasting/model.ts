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

export interface ForecastAccuracyMetrics {
	/** Jumlah titik prediksi yang sudah jatuh tempo dan dinilai. */
	sampleCount: number;
	/** Galat absolut rata-rata, dalam satuan parameternya (m³/s atau mdpl). */
	mae: number | null;
	rmse: number | null;
	/** MAE ÷ rerata realisasi × 100. */
	relativeErrorPercent: number | null;
	/** 100 − galat relatif (≥ 0). Menyesatkan bila rerata realisasi mendekati nol. */
	accuracyPercent: number | null;
}

/**
 * Akurasi prediksi yang SUDAH tersaji ke operator dibanding realisasinya —
 * berbeda dari metrik saat model dilatih. `byVersion` memecahnya per versi
 * model; `isFallback` = prediksi tanpa model (seasonal-naive).
 */
export interface ForecastAccuracyReport extends ForecastAccuracyMetrics {
	byVersion: (ForecastAccuracyMetrics & { version: string; isFallback: boolean })[];
}

export interface ForecastAccuracyInput extends ForecastQueryInput {
	/** ISO 8601; batas waktu prediksi yang dinilai. */
	start: string;
	end: string;
}
