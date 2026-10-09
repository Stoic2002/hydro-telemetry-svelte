import type {
	ChangePasswordInput,
	CreateUserInput,
	PaginatedUsers,
	UpdateUserInput,
	UserAccount,
	UserListParams
} from '../model';

export interface UsersRepository {
	list(params: UserListParams): Promise<PaginatedUsers>;
	create(input: CreateUserInput): Promise<UserAccount>;
	updateCurrentUser(input: UpdateUserInput): Promise<UserAccount>;
	changeCurrentPassword(input: ChangePasswordInput): Promise<void>;
	updateById(userId: string, input: UpdateUserInput): Promise<UserAccount>;
	updateStatus(userId: string, isActive: boolean): Promise<UserAccount>;
	deleteById(userId: string): Promise<void>;
	/**
	 * Mencabut semua token user ini (semua perangkat) tanpa menonaktifkan
	 * akunnya — untuk token yang dicurigai bocor. Pemiliknya tetap bisa login
	 * ulang.
	 */
	revokeSessions(userId: string): Promise<void>;
}
