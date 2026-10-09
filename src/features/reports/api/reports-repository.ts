import type { CreateReportInput, Report, ReportListParams, ReportPage } from '../model';

export interface ReportRequestOptions {
	signal?: AbortSignal;
}

export interface ReportsRepository {
	create(input: CreateReportInput): Promise<Report>;
	list(params: ReportListParams, options?: ReportRequestOptions): Promise<ReportPage>;
	get(reportId: string, options?: ReportRequestOptions): Promise<Report>;
	download(reportId: string): Promise<Blob>;
	/**
	 * Excel time-series 13 kolom (rata-rata per jam WIB) satu PLTA, langsung
	 * tanpa antrean. `start`/`end` = tanggal WIB `YYYY-MM-DD`, inklusif, maks.
	 * 62 hari.
	 */
	downloadTimeseriesExcel(pltaId: string, start: string, end: string): Promise<Blob>;
}
