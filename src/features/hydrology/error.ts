import { ApiError } from '../../api/http';
import { apiLabelErrorSchema, apiMonthlyHydrologyExcelErrorSchema } from './api/schemas';
import type { MonthlyHydrologyExcelRowError } from './model';

export function getHydrologyErrorMessage(error: unknown): string {
	if (ApiError.isApiError(error)) {
		if (error.status === 404) return 'Data hidrologi belum tersedia';
		if (error.status === 410) return 'Berkas hidrologi sudah tidak tersedia';
		if (error.status === 422) return 'Parameter hidrologi tidak valid';
		if (error.status === 0) return 'Tidak dapat terhubung ke server hidrologi';
		return error.message;
	}

	if (error instanceof Error && error.message) return error.message;
	return 'Terjadi kesalahan saat memuat data hidrologi';
}

/**
 * Backend melaporkan galat impor Excel sebagai objek `detail`, bukan string,
 * sehingga pesan bawaan `ApiError` hanya berisi "Bad Request". Dua helper di
 * bawah membongkar objek itu jadi kalimat dan daftar baris bermasalah.
 */
function parseExcelErrorDetail(error: unknown) {
	if (!ApiError.isApiError(error)) return null;

	const parsed = apiMonthlyHydrologyExcelErrorSchema.safeParse(error.details);
	return parsed.success ? parsed.data : null;
}

export function getMonthlyExcelErrorMessage(error: unknown): string {
	const detail = parseExcelErrorDetail(error);
	if (detail?.pesan) return detail.pesan;

	if (ApiError.isApiError(error) && error.status === 400) {
		return 'Berkas tidak dapat diproses. Pastikan formatnya .xlsx dan berasal dari template.';
	}

	return getHydrologyErrorMessage(error);
}

export function getMonthlyExcelRowErrors(error: unknown): MonthlyHydrologyExcelRowError[] {
	const detail = parseExcelErrorDetail(error);

	return (detail?.rincian ?? []).map((item) => ({
		row: item.baris,
		pltaCode: item.kode_plta,
		message: item.pesan
	}));
}

/**
 * `400` dari `PUT …/labels` membawa objek `detail` (`pesan` + satu kalimat per
 * nama yang ditolak). Satu masalah saja membuat tidak ada yang tersimpan.
 */
export function getLabelErrorDetail(error: unknown): { message: string; problems: string[] } {
	if (ApiError.isApiError(error)) {
		const parsed = apiLabelErrorSchema.safeParse(error.details);
		if (parsed.success) return { message: parsed.data.pesan, problems: parsed.data.masalah };
		if (error.status === 403) {
			return { message: 'Hanya admin yang dapat mengganti nama.', problems: [] };
		}
	}
	return { message: getHydrologyErrorMessage(error), problems: [] };
}
