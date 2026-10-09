export interface UploadHistoryItem {
	filename: string;
	dataType: 'Volume Efektif';
	period: string;
	uploadedAt: string;
	rows: number;
	status: 'Tervalidasi' | 'Gagal Validasi' | 'Diproses';
}

export interface ElevationPoint {
	elevation: number;
	volume: number;
	area: number;
}

export interface UploadElevationExcelInput {
	pltaId: string;
	year: number;
	file: File;
	publish: boolean;
}

export interface ElevationUploadResult {
	id: string;
	pltaId: string;
	year: number;
	status: 'draft' | 'published';
	minElevation: number | null;
	maxElevation: number | null;
	points: Array<ElevationPoint & { id: string }>;
}

export type ElevationCurveStatus = 'draft' | 'published';

/**
 * Kesiapan kurva EVA satu PLTA. `ready` = ada kurva published yang berlaku,
 * volume waduk terhitung. `draft` = sudah diunggah tetapi BELUM dipakai
 * perhitungan apa pun. `missing` = belum ada kurva sama sekali.
 */
export type ElevationReadiness = 'ready' | 'draft' | 'missing';

export interface PlantElevationStatus {
	pltaId: string;
	plantCode: string;
	plantName: string;
	readiness: ElevationReadiness;
	/** Tahun kurva yang sedang dipakai; kurva 2024 bisa masih berlaku di 2026. */
	effectiveYear: number | null;
	pointCount: number | null;
	minElevation: number | null;
	maxElevation: number | null;
	publishedYears: number[];
	draftYears: number[];
}

export interface ElevationStatusOverview {
	year: number;
	totals: { plants: number; ready: number; draft: number; missing: number };
	plants: PlantElevationStatus[];
}

/** Kurva lain yang titiknya identik — tanda berkas PLTA lain terunggah ke sini. */
export interface ElevationCurveTwin {
	id: string;
	pltaId: string;
	plantCode: string;
	plantName: string;
	year: number;
	status: ElevationCurveStatus;
}

export interface ElevationCurveSummary {
	id: string;
	pltaId: string;
	plantCode: string;
	plantName: string;
	year: number;
	status: ElevationCurveStatus;
	pointCount: number;
	minElevation: number | null;
	maxElevation: number | null;
	/** Kurva yang sungguh menentukan volume; satu PLTA bisa punya beberapa published. */
	isEffective: boolean;
	twins: ElevationCurveTwin[];
}
