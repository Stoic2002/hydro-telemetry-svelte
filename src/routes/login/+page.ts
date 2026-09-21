import { requireGuest } from '$core/guards';

export const load = () => requireGuest();
