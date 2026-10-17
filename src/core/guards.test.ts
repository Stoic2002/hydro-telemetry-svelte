import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Guard dijalankan paralel dengan `load` layout root, jadi ia tidak boleh
 * menganggap sesi sudah pulih. Test ini meniru refresh browser: token ada, tapi
 * `/auth/me` baru selesai beberapa saat setelah guard mulai.
 */

const session = vi.hoisted(() => ({
	isAuthenticated: false,
	sessionExpired: false,
	user: null as { role: string } | null,
	initialize: vi.fn()
}));

vi.mock('../features/auth', async () => ({
	...(await vi.importActual<typeof import('../features/auth/return-path')>(
		'../features/auth/return-path'
	)),
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
	session.sessionExpired = false;
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

	it('membawa halaman asal ke /login supaya sesudah masuk kembali ke sana', async () => {
		session.initialize.mockResolvedValue(undefined);
		const url = new URL('http://app.test/dashboard/plta/abc/telemetering/harian?units=1,2');

		expect(await redirectLocation(() => requireAuthenticated(url))).toBe(
			'/login?kembali=%2Fdashboard%2Fplta%2Fabc%2Ftelemetering%2Fharian%3Funits%3D1%2C2'
		);
	});

	it('menandai sesi habis bila token tersimpan ditolak server', async () => {
		session.initialize.mockImplementation(async () => {
			session.sessionExpired = true;
		});

		expect(await redirectLocation(() => requireAuthenticated())).toBe('/login?sesi=habis');
	});

	it('meneruskan pengguna yang sudah masuk ke alamat ?kembali=', async () => {
		restoreSessionLater('Operator PLTA');
		const url = new URL('http://app.test/login?kembali=%2Fdashboard%2Fcatalog');

		expect(await redirectLocation(() => requireGuest(url))).toBe('/dashboard/catalog');
	});
});
