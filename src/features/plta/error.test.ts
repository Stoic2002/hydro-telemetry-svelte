import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/http';
import { getTagSaveErrorDetail } from './error';

function apiError(status: number, details: unknown, message = 'Bad Request') {
	return new ApiError(message, { status, statusText: message, details, url: '/api/v1/tags' });
}

describe('galat tag baru', () => {
	it('409: kombinasi PLTA, parameter, dan station sudah terdaftar', () => {
		expect(getTagSaveErrorDetail(apiError(409, null, 'Conflict')).message).toContain(
			'sudah terdaftar'
		);
	});

	it('400: menampilkan setiap masalah dari server', () => {
		const detail = getTagSaveErrorDetail(
			apiError(400, { pesan: 'Konfigurasi tak sah', masalah: ['address kosong', 'scale 0'] })
		);

		expect(detail).toEqual({
			message: 'Konfigurasi tag ditolak server.',
			problems: ['address kosong', 'scale 0']
		});
	});

	it('400 tanpa daftar masalah memakai pesan server', () => {
		expect(getTagSaveErrorDetail(apiError(400, 'PLTA tak dikenal', 'PLTA tak dikenal'))).toEqual({
			message: 'PLTA tak dikenal',
			problems: []
		});
	});
});
