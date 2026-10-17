import { redirect } from '@sveltejs/kit';
import {
	authStore,
	canAccessDataTools,
	canManageUsers,
	canUploadMonthlyHydrology,
	loginPath,
	RETURN_PATH_PARAM,
	safeReturnPath
} from '../features/auth';
import {
	ensurePlantCatalog,
	getPLTADashboardPath,
	pickDefaultPlant,
	type PLTADashboardPage
} from '../features/plta';
import { findForecastingPlant } from '../features/forecasting';
import { queryClient } from './query-client';

/**
 * Guard rute. Padanan `ProtectedRoute`, `AdminOnlyRoute`, `DataToolsRoute`, dan
 * `MonthlyUploadRoute` di versi React — tapi dijalankan di `load`, bukan saat
 * render.
 *
 * Bedanya penting: di React komponen guard sempat dirender sebelum memutuskan
 * mengalihkan, jadi halaman terlindungi bisa berkedip sekejap. Di sini
 * pengalihan terjadi sebelum ada yang dirender sama sekali.
 *
 * Setiap guard menunggu pemulihan sesi sendiri, BUKAN mengandalkan `load`
 * layout root yang sudah menunggunya. SvelteKit menjalankan `load` induk dan
 * anak secara paralel kecuali anak memanggil `await parent()`. Dulu guard di
 * sini sinkron, jadi saat halaman di-refresh ia membaca `isAuthenticated`
 * sebelum `/auth/me` selesai: `/dashboard/trends` dialihkan ke `/login`, lalu
 * `/login` — yang saat itu sesinya sudah pulih — mengalihkan ke `/dashboard`,
 * dan berakhir di Overview. `initialize()` idempoten dan mengembalikan promise
 * yang sama selama pemulihan berjalan, jadi memanggilnya di setiap guard tidak
 * menambah request.
 */

/**
 * `url` = alamat yang sedang dibuka. Dibawa ke halaman login supaya pengguna
 * kembali ke sana sesudah masuk, bukan ke Overview. Guard layout dan halaman
 * berjalan paralel dan yang mana pun bisa mengalihkan lebih dulu, jadi
 * setiap pemanggil wajib meneruskannya.
 */
export async function requireAuthenticated(url?: URL): Promise<void> {
	await authStore.initialize();
	if (!authStore.isAuthenticated) {
		redirect(307, loginPath(url, { expired: authStore.sessionExpired }));
	}
}

/** Pengguna yang sudah masuk diteruskan ke alamat `?kembali=`, bila ada. */
export async function requireGuest(url?: URL): Promise<void> {
	await authStore.initialize();
	if (authStore.isAuthenticated) {
		redirect(307, safeReturnPath(url?.searchParams.get(RETURN_PATH_PARAM)));
	}
}

/** Katalog Data: seluruh role kecuali Viewer. */
export async function requireDataTools(url?: URL): Promise<void> {
	await requireAuthenticated(url);
	if (!canAccessDataTools(authStore.user)) {
		redirect(307, '/dashboard/overview');
	}
}

export async function requireUserManagement(url?: URL): Promise<void> {
	await requireAuthenticated(url);
	if (!canManageUsers(authStore.user)) {
		redirect(307, '/dashboard/overview');
	}
}

export async function requireMonthlyUpload(url?: URL): Promise<void> {
	await requireAuthenticated(url);
	if (!canUploadMonthlyHydrology(authStore.user)) {
		redirect(307, '/dashboard/overview');
	}
}

/**
 * Tautan lama tanpa `pltaId` — mis. `/dashboard/trends` — dialihkan ke PLTA
 * bawaan sambil mempertahankan query string yang dibawa pengguna.
 */
export async function redirectToDefaultPLTA(
	page: PLTADashboardPage,
	search: string,
	url?: URL
): Promise<never> {
	// Katalog butuh token; tanpa ini request-nya berlomba dengan pemulihan sesi.
	await requireAuthenticated(url);

	const plants = await ensurePlantCatalog(queryClient);
	const defaultPlant = pickDefaultPlant(plants);

	if (!defaultPlant) {
		// Tidak ada plant sama sekali: Overview menangani keadaan kosong ini
		// dengan penjelasan, sedangkan rute ini tidak punya apa pun untuk dituju.
		redirect(307, '/dashboard/overview');
	}

	redirect(307, `${getPLTADashboardPath(defaultPlant.id, page)}${search}`);
}

/**
 * Forecasting hanya untuk PLTA Soedirman, jadi alamat tanpa `pltaId` dialihkan
 * ke PLTA itu — bukan ke PLTA bawaan seperti menu lain.
 */
export async function redirectToForecastingPlant(search: string, url?: URL): Promise<never> {
	await requireAuthenticated(url);

	const plants = await ensurePlantCatalog(queryClient);
	const plant = findForecastingPlant(plants);

	if (!plant) redirect(307, '/dashboard/overview');

	redirect(307, `${getPLTADashboardPath(plant.id, 'forecasting')}${search}`);
}
