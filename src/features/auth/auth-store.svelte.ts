import type { User } from './model';
import { ApiError } from '../../api/http/api-error';
import {
	clearAuthTokens,
	getAuthTokens,
	setAuthTokens,
	subscribeToAuthSession
} from '../../api/http/auth-session';
import { authRepository } from './api/repository';
import { mapAuthUserToUIUser } from './model';

/**
 * Sesi pengguna. Pengganti store Zustand di versi React.
 *
 * Tinggal di dalam `features/auth` karena ini state milik domain auth, bukan
 * lapisan tersendiri: yang membacanya adalah guard, halaman login, dan layar
 * yang menampilkan profil — semuanya lewat barrel `features/auth`.
 *
 * Token sendiri tetap tinggal di `api/http/auth-session` — store ini hanya
 * memegang profil dan status yang dibaca UI. Pemisahan itu dipertahankan supaya
 * lapisan transport tidak perlu mengenal model UI.
 */

let initializationPromise: Promise<void> | null = null;

function getLoginErrorMessage(error: unknown): string {
	if (!ApiError.isApiError(error)) {
		return 'Terjadi kesalahan saat masuk. Silakan coba kembali';
	}

	if (error.status === 0) return 'Tidak dapat terhubung ke server';
	if (error.status === 401) return 'Username atau password salah';
	if (error.status === 403) return 'Akun tidak memiliki izin untuk masuk';
	if (error.status === 422) return 'Username atau password tidak valid';
	if (error.status >= 500) return 'Server sedang mengalami gangguan';
	return error.message;
}

class AuthStore {
	user = $state<User | null>(null);
	isAuthenticated = $state(false);
	isInitialized = $state(false);
	isLoading = $state(false);
	error = $state<string | null>(null);

	async initialize(): Promise<void> {
		if (this.isInitialized) return;
		if (initializationPromise) return initializationPromise;

		initializationPromise = (async () => {
			if (!getAuthTokens()) {
				this.isInitialized = true;
				this.isLoading = false;
				return;
			}

			this.isLoading = true;
			this.error = null;

			try {
				const profile = await authRepository.getCurrentUser();
				if (!profile.is_active) {
					clearAuthTokens({ broadcast: true });
					this.user = null;
					this.isAuthenticated = false;
					this.isInitialized = true;
					this.isLoading = false;
					this.error = 'Akun sudah dinonaktifkan';
					return;
				}

				this.user = mapAuthUserToUIUser(profile);
				this.isAuthenticated = true;
				this.isInitialized = true;
				this.isLoading = false;
				this.error = null;
			} catch (error) {
				if (ApiError.isApiError(error) && (error.isUnauthorized || error.isForbidden)) {
					clearAuthTokens({ broadcast: true });
				}

				this.user = null;
				this.isAuthenticated = false;
				this.isInitialized = true;
				this.isLoading = false;
				this.error = getLoginErrorMessage(error);
			}
		})().finally(() => {
			initializationPromise = null;
		});

		return initializationPromise;
	}

	async refreshProfile(): Promise<boolean> {
		try {
			const profile = await authRepository.getCurrentUser();
			if (!profile.is_active) {
				clearAuthTokens({ broadcast: true });
				this.user = null;
				this.isAuthenticated = false;
				this.isLoading = false;
				this.error = 'Akun sudah dinonaktifkan';
				return false;
			}

			this.user = mapAuthUserToUIUser(profile);
			this.error = null;
			return true;
		} catch (error) {
			this.error = getLoginErrorMessage(error);
			return false;
		}
	}

	async login(username: string, password: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const tokens = await authRepository.login({ username, password });
			setAuthTokens(tokens);

			const profile = await authRepository.getCurrentUser();
			if (!profile.is_active) {
				clearAuthTokens();
				this.isLoading = false;
				this.error = 'Akun sudah dinonaktifkan';
				return false;
			}

			this.user = mapAuthUserToUIUser(profile);
			this.isAuthenticated = true;
			this.isInitialized = true;
			this.isLoading = false;
			this.error = null;
			return true;
		} catch (error) {
			clearAuthTokens();
			this.user = null;
			this.isAuthenticated = false;
			this.isLoading = false;
			this.error = getLoginErrorMessage(error);
			return false;
		}
	}

	/** Tidak ada endpoint logout di backend — keluar murni sisi klien. */
	logout(): void {
		clearAuthTokens({ broadcast: true });
		this.user = null;
		this.isAuthenticated = false;
		this.isInitialized = true;
		this.isLoading = false;
		this.error = null;
	}

	clearError(): void {
		this.error = null;
	}
}

export const authStore = new AuthStore();

// Logout dari tab lain menghapus token lewat BroadcastChannel; status di tab ini
// harus ikut turun tanpa menunggu request berikutnya gagal 401.
subscribeToAuthSession((tokens) => {
	if (!tokens) {
		authStore.user = null;
		authStore.isAuthenticated = false;
		authStore.isLoading = false;
	}
});
