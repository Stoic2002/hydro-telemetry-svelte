import { plantMatchesIdentity, type Plant } from '$features/plta';

/**
 * Forecasting hanya tersedia untuk PLTA PB Soedirman (Mrica).
 *
 * PLTA-nya dicari dari katalog lewat nama/kode, bukan UUID tertulis: id yang
 * sama berbeda di tiap environment (staging `4b4747da…`, backend lain
 * `727c0a7e…`). Dulu id ditulis langsung di sini, sehingga Forecasting di
 * staging meminta prediksi untuk PLTA yang tidak ada.
 */
const FORECASTING_PLANT_IDENTITIES = ['soedirman', 'mrica'];

export function findForecastingPlant<TPlant extends Pick<Plant, 'code' | 'name'>>(
	plants: TPlant[]
): TPlant | undefined {
	return plants.find((plant) =>
		FORECASTING_PLANT_IDENTITIES.some((identity) => plantMatchesIdentity(plant, identity))
	);
}
