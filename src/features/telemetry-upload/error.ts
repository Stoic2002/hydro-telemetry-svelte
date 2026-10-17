import { ApiError } from '../../api/http';

export function getTelemetryUploadErrorMessage(error: unknown): string {
	if (ApiError.isApiError(error)) {
		if (error.status === 400) {
			return 'Target upload atau data yang dikirim tidak valid';
		}
		if (error.status === 413) return 'Ukuran file melebihi batas 5 MB';
		if (error.status === 422) return 'Format data upload tidak valid';
		if (error.status === 0) {
			return 'Tidak dapat terhubung ke server telemetri';
		}
		return error.message;
	}

	if (error instanceof Error && error.message) return error.message;
	return 'Terjadi kesalahan saat mengunggah data telemetri';
}

/**
 * `400` dari hapus data dan template membawa alasan dari server (bukan tag
 * upload, konstanta, rentang terbalik, rentang > 366 hari) — lebih berguna
 * daripada pesan umum.
 */
function getServerDetailMessage(error: unknown, action: string): string {
	if (ApiError.isApiError(error)) {
		if (error.status === 400 && error.message) return error.message;
		if (error.status === 403) return `Anda tidak memiliki izin ${action}`;
		if (error.status === 0) return 'Tidak dapat terhubung ke server telemetri';
		return error.message;
	}

	if (error instanceof Error && error.message) return error.message;
	return `Terjadi kesalahan saat ${action}`;
}

export function getTelemetryDeleteErrorMessage(error: unknown): string {
	return getServerDetailMessage(error, 'menghapus data telemetri');
}

export function getTelemetryTemplateErrorMessage(error: unknown): string {
	return getServerDetailMessage(error, 'mengunduh template telemetri');
}
