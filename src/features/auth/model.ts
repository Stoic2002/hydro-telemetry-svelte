/**
 * Role dan profil pengguna dalam bentuk yang ditampilkan di layar.
 *
 * Dulu keduanya tinggal di `src/types/index.ts` — kumpulan tipe warisan versi
 * React yang isinya sudah tidak dipakai lagi selain ketiga tipe ini. Karena
 * sesi dan profil adalah milik domain auth, tempatnya di sini.
 */
export type UserRole = 'Super Admin' | 'Admin UBP' | 'Operator PLTA' | 'Viewer';

export interface User {
	id: string;
	name: string;
	username: string;
	email: string;
	role: UserRole;
	/** Daftar id PLTA yang boleh diakses. Backend belum mengirimkannya. */
	accessPLTA: string[];
	status: 'Aktif' | 'Nonaktif';
	lastLogin?: string;
	avatarColor?: string;
}

export type ApiUserRole = 'admin' | 'operator' | 'viewer';

export interface AuthUserResponse {
	username: string;
	email: string | null;
	full_name: string | null;
	role: ApiUserRole;
	is_active: boolean;
	id: string;
	created_at: string;
}

const uiRoleByApiRole: Record<ApiUserRole, UserRole> = {
	admin: 'Super Admin',
	operator: 'Operator PLTA',
	viewer: 'Viewer'
};

const avatarColorByApiRole: Record<ApiUserRole, string> = {
	admin: '#f59e0b',
	operator: '#14a2ba',
	viewer: '#64748b'
};

export function mapAuthUserToUIUser(profile: AuthUserResponse): User {
	return {
		id: profile.id,
		name: profile.full_name?.trim() || profile.username,
		username: profile.username,
		email: profile.email ?? '',
		role: uiRoleByApiRole[profile.role],
		accessPLTA: [],
		status: profile.is_active ? 'Aktif' : 'Nonaktif',
		lastLogin: profile.created_at,
		avatarColor: avatarColorByApiRole[profile.role]
	};
}
