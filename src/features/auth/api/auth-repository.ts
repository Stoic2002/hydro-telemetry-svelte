import type { AuthTokens } from '../../../api/http/auth-session';
import type { AuthUserResponse } from '../model';

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface AuthRepository {
	login(credentials: LoginCredentials): Promise<AuthTokens>;
	getCurrentUser(): Promise<AuthUserResponse>;
	/**
	 * Mencabut token sesi INI di server: access token lewat header, refresh token
	 * di badan permintaan (tanpa itu sesi bisa dihidupkan lagi lewat
	 * `/auth/refresh` sampai 7 hari). Server selalu membalas 204, juga untuk token
	 * yang sudah kedaluwarsa. Perangkat lain tidak terdampak.
	 */
	logout(tokens: AuthTokens): Promise<void>;
	/** Mencabut SEMUA token user ini — semua perangkat, termasuk sesi ini. */
	logoutAll(): Promise<void>;
}
