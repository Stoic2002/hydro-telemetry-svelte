import type { MonthlyHydrology } from '$features/hydrology';
import { MONTHS } from './presentation';

/** Tiga seri energi, urutannya sama dengan kolom tabel ringkasan. */
export type EnergySeriesKey = 'target' | 'prediction' | 'actual';

export const ENERGY_SERIES: readonly {
	key: EnergySeriesKey;
	label: string;
	/** Warna batang dan garis; target abu-abu sebagai acuan, realisasi warna aksen. */
	color: string;
}[] = [
	{ key: 'target', label: 'Target', color: 'var(--color-chart-reference)' },
	{ key: 'prediction', label: 'Prediksi', color: 'var(--color-chart-series-5)' },
	{ key: 'actual', label: 'Realisasi', color: 'var(--color-brand-primary-strong)' }
];

export type EnergyValues = Record<EnergySeriesKey, number | null>;

export interface EnergyMonth {
	month: number;
	/** `Jan`, `Feb`, … — label sumbu X. */
	shortLabel: string;
	/** `Maret 2026` — judul tooltip. */
	label: string;
	/** Energi bulan itu sendiri. */
	monthly: EnergyValues;
	/** Januari s.d. bulan itu, termasuk bulan itu (Swagger 7 Okt 2026). */
	accumulated: EnergyValues;
}

const EMPTY: EnergyValues = { target: null, prediction: null, actual: null };

/**
 * Dua belas bulan tahun terpilih dari `GET /hydrology/monthly?tahun=`. Server
 * hanya mengirim bulan yang pernah diisi, jadi bulan lain diisi `null` — bukan
 * 0, yang terbaca sebagai produksi nol. Sumbu X tetap Januari–Desember.
 *
 * Grafik akumulasi dulu memakai `/hydrology/monthly/chart`, yang tidak memuat
 * prediksi. Respons bulanan memuat keenam nilai, jadi kedua grafik kini
 * berbagi satu sumber (permintaan tim 9 Nov 2026).
 */
export function buildEnergyMonths(
	records: readonly MonthlyHydrology[],
	year: number
): EnergyMonth[] {
	const byMonth = new Map(
		records.filter((record) => record.year === year).map((record) => [record.month, record])
	);

	return MONTHS.map((name, index) => {
		const month = index + 1;
		const record = byMonth.get(month);
		return {
			month,
			shortLabel: name.slice(0, 3),
			label: `${name} ${year}`,
			monthly: record
				? {
						target: record.targetProductionMwh,
						prediction: record.predictedProductionMwh,
						actual: record.actualProductionMwh
					}
				: EMPTY,
			accumulated: record
				? {
						target: record.targetAccumulatedMwh,
						prediction: record.predictedAccumulatedMwh,
						actual: record.actualAccumulatedMwh
					}
				: EMPTY
		};
	});
}

export function hasEnergyValue(months: readonly EnergyMonth[], scope: 'monthly' | 'accumulated') {
	return months.some((month) => ENERGY_SERIES.some((series) => month[scope][series.key] !== null));
}
