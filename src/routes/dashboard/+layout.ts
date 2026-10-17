import { requireAuthenticated } from '$core/guards';

export const load = ({ url }) => requireAuthenticated(url);
