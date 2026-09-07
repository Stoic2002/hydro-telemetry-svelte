import { requireUserManagement } from '$core/guards';

export const load = () => {
	requireUserManagement();
};
