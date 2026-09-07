import { requireAuthenticated } from '$core/guards';

export const load = () => {
	requireAuthenticated();
};
