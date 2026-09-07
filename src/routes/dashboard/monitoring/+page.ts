import { redirectToDefaultPLTA } from '$core/guards';

/** Fitur "monitoring" lama sudah diganti "telemetering". */
export const load = ({ url }) => redirectToDefaultPLTA('telemetering/bulanan', url.search);
