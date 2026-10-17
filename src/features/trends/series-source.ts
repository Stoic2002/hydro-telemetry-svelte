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

/**
 * Resolusi data dalam bahasa operator: "per jam", bukan kode API `1h`.
 * Resolusi efektif dari server bisa berupa kode lain (mis. `15m`), jadi
 * kode yang tak dikenal diterjemahkan dari pola angka + satuannya.
 */
export function describeResolution(resolution: string | null | undefined): string {
	if (!resolution) return '';
	if (resolution === 'raw') return 'data mentah';
	const match = /^(\d+)([mhd])$/.exec(resolution);
	if (!match) return resolution;
	const amount = Number(match[1]);
	const unit = { m: 'menit', h: 'jam', d: 'hari' }[match[2] as 'm' | 'h' | 'd'];
	return amount === 1 ? `per ${unit}` : `per ${amount} ${unit}`;
}
