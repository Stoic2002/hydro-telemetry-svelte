import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Guard dijalankan paralel dengan `load` layout root, jadi ia tidak boleh
 * menganggap sesi sudah pulih. Test ini meniru refresh browser: token ada, tapi
 * `/auth/me` baru selesai beberapa saat setelah guard mulai.
 */

const session = vi.hoisted(() => ({
	isAuthenticated: false,
	user: null as { role: string } | null,
	initialize: vi.fn()
}));

vi.mock('../features/auth', () => ({
	authStore: session,
	canAccessDataTools: (user: { role: string } | null) => user !== null && user.role !== 'Viewer',
	canManageUsers: (user: { role: string } | null) => user?.role === 'Super Admin',
	canUploadMonthlyHydrology: (user: { role: string } | null) =>
		user !== null && user.role !== 'Viewer'
}));

vi.mock('../features/plta', () => ({}));
vi.mock('./query-client', () => ({ queryClient: {} }));

const { requireAuthenticated, requireDataTools, requireGuest } = await import('./guards');

function restoreSessionLater(role: string) {
	session.initialize.mockImplementation(async () => {
		await new Promise((resolve) => setTimeout(resolve, 5));
		session.isAuthenticated = true;
		session.user = { role };
	});
}

async function redirectLocation(guard: () => Promise<void>): Promise<string | null> {
	try {
		await guard();
		return null;
	} catch (error) {
		if (isRedirect(error)) return error.location;
		throw error;
	}
}

beforeEach(() => {
	session.isAuthenticated = false;
	session.user = null;
	session.initialize.mockReset();
});

describe('guard saat sesi masih dipulihkan', () => {
	it('tidak mengalihkan pengguna yang sesinya ternyata valid ke /login', async () => {
		restoreSessionLater('Operator PLTA');

		expect(await redirectLocation(requireAuthenticated)).toBeNull();
	});

	it('menunggu profil sebelum memeriksa role', async () => {
		restoreSessionLater('Operator PLTA');

		expect(await redirectLocation(requireDataTools)).toBeNull();
	});

	it('tetap mengalihkan Viewer dari alat data', async () => {
		restoreSessionLater('Viewer');

		expect(await redirectLocation(requireDataTools)).toBe('/dashboard/overview');
	});

	it('mengalihkan ke /login bila sesi memang tidak ada', async () => {
		session.initialize.mockResolvedValue(undefined);

		expect(await redirectLocation(requireAuthenticated)).toBe('/login');
	});

	it('mengalihkan pengguna yang sudah masuk dari halaman login', async () => {
		restoreSessionLater('Operator PLTA');

		expect(await redirectLocation(requireGuest)).toBe('/dashboard');
	});
});
