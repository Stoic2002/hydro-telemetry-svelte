import type { TrendSeries } from './model';

/**
 * Sumber seri yang SUNGGUH dibaca server — bukan yang diminta. Tanpa `station`,
 * server memilih sendiri: seri tingkat-pembangkit bila ada isinya, selain itu
 * agregat lintas station. Dua kasus itu menghasilkan angka yang berbeda arti,
 * jadi layar harus menyebutkan mana yang terjadi.
 */
export function describeSeriesSource(
	series: Pick<TrendSeries, 'station' | 'aggregatedStations'>
): string {
	if (series.station === null) {
		const stations = series.aggregatedStations;
		return stations.length > 0
			? `agregasi ${stations.length} stasiun (${stations.join(', ')})`
			: 'agregasi lintas stasiun';
	}

	return series.station === '' ? 'tingkat pembangkit' : `stasiun ${series.station}`;
}
