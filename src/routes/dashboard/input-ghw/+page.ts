import { redirectToDefaultPLTA } from '$core/guards';

/** Tautan lama tanpa `pltaId`. Dipertahankan supaya bookmark operator tidak mati. */
export const load = ({ url }) => redirectToDefaultPLTA('input-ghw', url.search);
