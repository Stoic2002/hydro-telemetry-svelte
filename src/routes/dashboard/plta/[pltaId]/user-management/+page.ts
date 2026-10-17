import { requireUserManagement } from '$core/guards';

export const load = ({ url }) => requireUserManagement(url);
