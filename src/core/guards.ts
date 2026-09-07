import { redirect } from '@sveltejs/kit';
import {
	authStore,
	canAccessDataTools,
	canManageUsers,
	canUploadMonthlyHydrology
} from '../features/auth';
import {
	ensurePlantCatalog,
	getPLTADashboardPath,
	pickDefaultPlant,
	type PLTADashboardPage
} from '../features/plta';
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
 * Status sesi sudah dipastikan tersedia oleh `load` layout root, jadi seluruh
 * pemeriksaan di bawah bisa sinkron.
 */

export function requireAuthenticated(): void {
	if (!authStore.isAuthenticated) {
		redirect(307, '/login');
	}
}

export function requireGuest(): void {
	if (authStore.isAuthenticated) {
		redirect(307, '/dashboard');
	}
}

/** Input GHW dan Katalog Data: seluruh role kecuali Viewer. */
export function requireDataTools(): void {
	if (!canAccessDataTools(authStore.user)) {
		redirect(307, '/dashboard/overview');
	}
}

export function requireUserManagement(): void {
	if (!canManageUsers(authStore.user)) {
		redirect(307, '/dashboard/overview');
	}
}

export function requireMonthlyUpload(): void {
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
	search: string
): Promise<never> {
	const plants = await ensurePlantCatalog(queryClient);
	const defaultPlant = pickDefaultPlant(plants);

	if (!defaultPlant) {
		// Tidak ada plant sama sekali: Overview menangani keadaan kosong ini
		// dengan penjelasan, sedangkan rute ini tidak punya apa pun untuk dituju.
		redirect(307, '/dashboard/overview');
	}

	redirect(307, `${getPLTADashboardPath(defaultPlant.id, page)}${search}`);
}
