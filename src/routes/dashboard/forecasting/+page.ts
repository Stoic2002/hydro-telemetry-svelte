import { redirectToForecastingPlant } from '$core/guards';

/**
 * Pintu masuk Forecasting tanpa `pltaId` — dipakai menu dan Panduan, juga
 * bookmark lama. Selalu berakhir di PLTA Soedirman, karena hanya PLTA itu yang
 * punya model prediksi.
 */
export const load = ({ url }) => redirectToForecastingPlant(url.search);
