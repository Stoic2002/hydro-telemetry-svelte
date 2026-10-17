import { ApiError } from '../../api/http';
import { apiTrendListErrorSchema } from './api/schemas';

export function getTrendErrorMessage(error: unknown): string {
	if (ApiError.isApiError(error)) {
		if (error.status === 0) return 'Tidak dapat terhubung ke server';
		if (error.status === 403) return 'Hanya admin yang dapat mengubah daftar tren';
		if (error.status === 404) return 'PLTA tidak ditemukan';
		if (error.status === 400 && error.message) return error.message;
		if (error.status >= 500) return 'Server sedang mengalami gangguan';
		return error.message;
	}
	if (error instanceof Error && error.message) return error.message;
	return 'Terjadi kesalahan saat memuat data tren';
}

/**
 * `400` dari `PUT …/series` membawa objek `detail` (`pesan` + satu kalimat per
 * item yang ditolak), bukan string — tanpa ini operator hanya membaca "Bad
 * Request". Tidak ada yang tersimpan bila satu saja ditolak.
 */
export function getTrendListErrorDetail(error: unknown): { message: string; problems: string[] } {
	if (ApiError.isApiError(error)) {
		const parsed = apiTrendListErrorSchema.safeParse(error.details);
		if (parsed.success) return { message: parsed.data.pesan, problems: parsed.data.masalah };
	}
	return { message: getTrendErrorMessage(error), problems: [] };
}
