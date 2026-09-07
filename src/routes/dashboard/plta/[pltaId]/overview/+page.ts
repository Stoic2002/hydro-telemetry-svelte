import { redirect } from '@sveltejs/kit';

/** Overview memuat seluruh Jawa Tengah, jadi tidak pernah dilingkupi satu PLTA. */
export const load = () => {
	redirect(307, '/dashboard/overview');
};
