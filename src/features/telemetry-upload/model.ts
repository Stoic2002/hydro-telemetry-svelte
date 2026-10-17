import type { MonitoringParameter } from '../monitoring';

export interface TelemetryUploadPoint {
	time: string;
	value: number;
}

export interface UploadTelemetryPointsInput {
	pltaId: string;
	parameter: MonitoringParameter;
	station: string;
	points: TelemetryUploadPoint[];
}

export interface UploadTelemetryExcelInput {
	pltaId: string;
	parameter: MonitoringParameter;
	station: string;
	file: File;
}

export interface TelemetryUploadResult {
	pltaId: string;
	parameter: MonitoringParameter;
	pointsUpserted: number;
	filename: string | null;
}

/**
 * Rentang penghapusan data manual. `start`/`end` tanpa zona waktu (WIB) dan
 * **inklusif di kedua ujung**, mengikuti server.
 */
export interface DeleteTelemetryPointsInput {
	pltaId: string;
	parameter: MonitoringParameter;
	station: string;
	start: string;
	end: string;
}

export interface TelemetryDeleteResult {
	pltaId: string;
	parameter: MonitoringParameter;
	station: string;
	pointsDeleted: number;
}

/**
 * Cakupan template unggah satu parameter. Server membedakan periode
 * (`harian`/`bulanan`) dan resolusi (`jam`/`hari`); kombinasi harian per
 * hari — satu baris — tidak ditawarkan.
 */
export type TelemetryTemplateScope = 'day-hourly' | 'month-hourly' | 'month-daily';

export interface DownloadTelemetryTemplateInput {
	pltaId: string;
	parameter: MonitoringParameter;
	station: string;
	scope: TelemetryTemplateScope;
	/** `YYYY-MM-DD`; untuk cakupan bulanan hanya tahun dan bulannya yang dipakai. */
	date: string;
}

/** Satu tujuan station pada form isian; `station` kosong = tag tanpa station. */
export interface DailyTelemetryUploadStation {
	station: string;
	label: string;
}

/**
 * Tujuan form isian satu baris panel harian, disusun dari field `input` yang
 * dikirim server — bukan dari daftar tag. Server memakai syarat yang sama saat
 * menerima unggahan, jadi tujuan di sini pasti diterima.
 */
export interface DailyTelemetryUploadTarget {
	label: string;
	parameter: MonitoringParameter;
	unit: string;
	/** Minimal satu. Lebih dari satu untuk metrik multi-stasiun (pintu spillway G1–G4). */
	stations: DailyTelemetryUploadStation[];
}
