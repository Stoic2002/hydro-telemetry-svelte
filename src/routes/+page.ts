import { redirect } from '@sveltejs/kit';
import { authStore } from '../features/auth';

/** Akar aplikasi tidak punya layar sendiri. */
export const load = () => {
	redirect(307, authStore.isAuthenticated ? '/dashboard' : '/login');
};
