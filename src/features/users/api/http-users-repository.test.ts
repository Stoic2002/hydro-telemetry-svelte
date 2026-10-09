import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpUsersRepository } from './http-users-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => {
	apiRequestMock.mockReset();
	apiRequestMock.mockResolvedValue(undefined);
});

describe('cabut sesi user', () => {
	it('memanggil revoke-sessions untuk user itu', async () => {
		await httpUsersRepository.revokeSessions('11111111-1111-4111-8111-111111111111');

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/users/11111111-1111-4111-8111-111111111111/revoke-sessions');
		expect(options?.method).toBe('POST');
	});
});
