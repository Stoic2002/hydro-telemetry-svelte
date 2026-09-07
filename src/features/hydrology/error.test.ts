import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/http';
import {
	getHydrologyErrorMessage,
	getMonthlyExcelErrorMessage,
	getMonthlyExcelRowErrors
} from './error';

/**
 * Endpoint impor Excel melaporkan galat sebagai objek `{pesan, rincian}` di
 * dalam `detail`, bukan string. Pembaca pesan bawaan `ApiError` tidak mengerti
 * bentuk itu dan hanya menghasilkan "Bad Request", sehingga operator kehilangan
 * satu-satunya petunjuk baris mana yang salah. Tes ini menjaga pembongkarnya.
 */
function excelError(detail: unknown): ApiError {
	return new ApiError('Bad Request', {
		status: 400,
		statusText: 'Bad Request',
		details: detail,
		url: '/api/v1/hydrology/monthly/excel'
	});
}

describe('getMonthlyExcelErrorMessage', () => {
	it('memakai kalimat dari server bila tersedia', () => {
		const error = excelError({
			pesan: '1 baris bermasalah — tidak ada data yang disimpan',
			rincian: [{ baris: 2, kode_plta: 'PLTA-XXX', pesan: 'kode_plta tidak dikenal' }]
		});

		expect(getMonthlyExcelErrorMessage(error)).toBe(
			'1 baris bermasalah — tidak ada data yang disimpan'
		);
	});

	it('memberi kalimat cadangan saat 400 tanpa detail yang bisa dibaca', () => {
		expect(getMonthlyExcelErrorMessage(excelError(null))).toContain('.xlsx');
	});

	it('jatuh ke pesan hidrologi umum untuk galat non-impor', () => {
		const error = new ApiError('apa saja', {
			status: 404,
			statusText: 'Not Found',
			url: '/api/v1/hydrology/monthly'
		});

		expect(getMonthlyExcelErrorMessage(error)).toBe(getHydrologyErrorMessage(error));
	});
});

describe('getMonthlyExcelRowErrors', () => {
	it('memetakan rincian baris apa adanya', () => {
		const error = excelError({
			pesan: '2 baris bermasalah — tidak ada data yang disimpan',
			rincian: [
				{ baris: 2, kode_plta: 'PLTA-XXX', pesan: 'kode_plta tidak dikenal' },
				{ baris: 7, kode_plta: null, pesan: 'bulan wajib diisi' }
			]
		});

		expect(getMonthlyExcelRowErrors(error)).toEqual([
			{ row: 2, pltaCode: 'PLTA-XXX', message: 'kode_plta tidak dikenal' },
			{ row: 7, pltaCode: null, message: 'bulan wajib diisi' }
		]);
	});

	it('mengembalikan daftar kosong untuk galat berkas, bukan galat baris', () => {
		// Berkas yang bukan Excel ditolak sebelum baris mana pun dibaca, jadi
		// `rincian` kosong dan tabel baris bermasalah tidak boleh muncul.
		const error = excelError({
			pesan: 'Berkas tidak terbaca sebagai Excel: File is not a zip file',
			rincian: []
		});

		expect(getMonthlyExcelRowErrors(error)).toEqual([]);
	});

	it('tidak meledak untuk galat yang sama sekali bukan ApiError', () => {
		expect(getMonthlyExcelRowErrors(new Error('offline'))).toEqual([]);
	});
});
