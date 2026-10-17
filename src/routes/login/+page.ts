import { requireGuest } from '$core/guards';

export const load = ({ url }) => requireGuest(url);
