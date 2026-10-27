import type { TrendSeries } from '$features/trends';

export interface TimeRange {
	from: string;
	to: string;
}

export interface TrendChartDatum {
	time: Date;
	iso: string;
	value: number;
}

/**
 * Titik deret → data grafik satu parameter, urut waktu. Dulu fungsi ini juga
 * menggabungkan periode pembanding ke sumbu waktu yang sama; pembanding
 * dihapus 27 Okt 2026 atas keputusan rapat tim.
 */
export function toChartData(points: TrendSeries['points']): TrendChartDatum[] {
	return points
		.map((point) => ({ time: new Date(point.time), iso: point.time, value: point.value }))
		.sort((left, right) => left.time.getTime() - right.time.getTime());
}
