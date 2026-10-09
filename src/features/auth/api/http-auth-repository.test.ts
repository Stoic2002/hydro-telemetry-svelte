import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpAuthRepository } from './http-auth-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => {
	apiRequestMock.mockReset();
	apiRequestMock.mockResolvedValue(undefined);
});

describe('pencabutan sesi', () => {
	it('logout mengirim access token di header DAN refresh token di badan', async () => {
		// Tanpa refresh token, sesi bisa dihidupkan lagi lewat /auth/refresh
		// sampai 7 hari walau access token-nya dicabut.
		await httpAuthRepository.logout({
			access_token: 'akses-lama',
			refresh_token: 'refresh-lama',
			token_type: 'bearer'
		});

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/auth/logout');
		expect(options?.method).toBe('POST');
		expect(options?.headers).toMatchObject({ Authorization: 'Bearer akses-lama' });
		expect(options?.json).toEqual({ refresh_token: 'refresh-lama' });
		// Sesi lokal sudah dibersihkan; jangan mencoba refresh demi sesi yang dicabut.
		expect(options?.auth).toBe(false);
		expect(options?.retryOnUnauthorized).toBe(false);
	});

	it('logout-all memakai sesi yang sedang berjalan', async () => {
		await httpAuthRepository.logoutAll();

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/auth/logout-all');
		expect(options?.method).toBe('POST');
		expect(options?.auth).toBeUndefined();
	});
});
