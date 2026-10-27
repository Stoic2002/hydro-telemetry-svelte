import { ApiError } from '../../api/http';

export function getPLTAErrorMessage(error: unknown): string {
	if (!ApiError.isApiError(error)) {
		return error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data PLTA';
	}

	if (error.status === 0) {
		return 'Tidak dapat terhubung ke server. Periksa VITE_API_BASE_URL dan pastikan backend sedang aktif.';
	}
	if (error.status === 403) return 'Anda tidak memiliki izin untuk mengakses data PLTA';
	if (error.status === 404) return 'Data PLTA tidak ditemukan';
	if (error.status === 422) return 'Filter data PLTA tidak lolos validasi server';

	return error.message;
}

/**
 * Galat saat menyimpan PLTA atau Wilayah Sungai. `400` membawa alasan dari
 * server (mis. kode sudah dipakai, Wilayah Sungai tidak dikenal), jadi pesan
 * server-nya yang tampil.
 */
export function getPLTASaveErrorMessage(error: unknown): string {
	if (ApiError.isApiError(error)) {
		if (error.status === 0) return 'Tidak dapat terhubung ke server. Coba lagi sebentar.';
		if (error.status === 403)
			return 'Hanya admin yang dapat mengubah data PLTA dan Wilayah Sungai.';
		if (error.status === 404) return 'Data ini sudah tidak ada di server. Muat ulang halaman.';
		if (error.status === 422) return 'Isian belum sesuai aturan server. Periksa kembali isiannya.';
		if (error.status >= 500) return 'Server sedang bermasalah. Perubahan belum tersimpan.';
		return error.message;
	}
	return error instanceof Error && error.message ? error.message : 'Perubahan belum tersimpan.';
}

/**
 * Galat saat mendaftarkan tag. `400` membawa `detail.masalah[]` (satu kalimat
 * per konfigurasi yang ditolak) dan `409` berarti kombinasi PLTA, parameter,
 * dan station itu sudah terdaftar.
 */
export function getTagSaveErrorDetail(error: unknown): { message: string; problems: string[] } {
	if (ApiError.isApiError(error)) {
		if (error.status === 409) {
			return {
				message: 'Parameter dengan station yang sama sudah terdaftar di PLTA ini.',
				problems: []
			};
		}
		const details = error.details;
		const problems =
			typeof details === 'object' &&
			details !== null &&
			Array.isArray(Reflect.get(details, 'masalah'))
				? (Reflect.get(details, 'masalah') as unknown[]).filter(
						(item): item is string => typeof item === 'string'
					)
				: [];
		if (error.status === 400) {
			return {
				message: problems.length > 0 ? 'Konfigurasi tag ditolak server.' : error.message,
				problems
			};
		}
	}
	return { message: getPLTASaveErrorMessage(error), problems: [] };
}
