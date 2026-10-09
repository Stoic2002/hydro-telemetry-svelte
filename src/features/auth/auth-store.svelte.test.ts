import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthTokens, setAuthTokens } from '../../api/http/auth-session';
import { authRepository } from './api/repository';
import { authStore } from './auth-store.svelte';

vi.mock('./api/repository', () => ({
	authRepository: {
		login: vi.fn(),
		getCurrentUser: vi.fn(),
		logout: vi.fn(),
		logoutAll: vi.fn()
	}
}));

const repository = vi.mocked(authRepository);
const TOKENS = { access_token: 'akses', refresh_token: 'refresh', token_type: 'bearer' };

beforeEach(() => {
	vi.clearAllMocks();
	setAuthTokens(TOKENS);
	authStore.isAuthenticated = true;
});

describe('keluar', () => {
	it('membersihkan sesi lokal lalu mencabut token yang tadi dipakai di server', async () => {
		repository.logout.mockResolvedValue();

		await authStore.logout();

		expect(getAuthTokens()).toBeNull();
		expect(authStore.isAuthenticated).toBe(false);
		expect(repository.logout).toHaveBeenCalledWith(TOKENS);
	});

	it('tetap keluar walau server gagal dihubungi', async () => {
		repository.logout.mockRejectedValue(new Error('jaringan putus'));

		await expect(authStore.logout()).resolves.toBeUndefined();
		expect(getAuthTokens()).toBeNull();
		expect(authStore.isAuthenticated).toBe(false);
	});

	it('tidak menunggu server lebih lama dari batas waktunya', async () => {
		vi.useFakeTimers();
		repository.logout.mockReturnValue(new Promise(() => {}));

		const done = authStore.logout();
		await vi.advanceTimersByTimeAsync(3_000);

		await expect(done).resolves.toBeUndefined();
		vi.useRealTimers();
	});
});

describe('keluar dari semua perangkat', () => {
	it('membersihkan sesi lokal setelah server mencabut semua token', async () => {
		repository.logoutAll.mockResolvedValue();

		await authStore.logoutAll();

		expect(repository.logoutAll).toHaveBeenCalledTimes(1);
		expect(getAuthTokens()).toBeNull();
	});

	it('mempertahankan sesi dan melempar galat bila server gagal', async () => {
		// Pengguna tidak boleh mengira tokennya sudah dicabut padahal belum.
		repository.logoutAll.mockRejectedValue(new Error('500'));

		await expect(authStore.logoutAll()).rejects.toThrow('500');
		expect(getAuthTokens()).toEqual(TOKENS);
		expect(authStore.isAuthenticated).toBe(true);
	});
});
