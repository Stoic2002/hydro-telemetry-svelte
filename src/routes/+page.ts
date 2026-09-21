import { redirect } from '@sveltejs/kit';
import { authStore } from '../features/auth';

/**
 * Akar aplikasi tidak punya layar sendiri.
 *
 * Pemulihan sesi ditunggu di sini juga: `load` ini berjalan paralel dengan
 * `load` layout root, bukan setelahnya (lihat `core/guards.ts`).
 */
export const load = async () => {
	await authStore.initialize();
	redirect(307, authStore.isAuthenticated ? '/dashboard' : '/login');
};
