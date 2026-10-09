import { goto } from '$app/navigation';
import { page } from '$app/state';
import { createMonthlyHydrologyOverviewQuery } from '$features/hydrology';
import {
	ALL_MONTHS,
	currentReportPeriod,
	formatReportMonthKey,
	hasReportRange,
	isFleetAchieved,
	missingPlantCount,
	nextReportSearch,
	parseReportEndMonth,
	parseReportEndYear,
	parseReportMonth,
	parseReportYear,
	previousReportMonth,
	reportPeriodLabel,
	reportRangeError
} from '../hydrology-report';

export type FleetPeriodKey = 'tahun' | 'bulan' | 'tahun_akhir' | 'bulan_akhir';

/**
 * Status ringkasan seluruh PLTA di Overview, dipakai dua komponen: pemilih
 * periode di kepala halaman dan kartu ringkasan di dasar peta. Periodenya
 * tinggal di URL (`?tahun=&bulan=&tahun_akhir=&bulan_akhir=`), dan kedua
 * pemanggil membuat query yang sama — TanStack menyatukannya menjadi satu
 * permintaan — sehingga keduanya tidak mungkin berselisih.
 *
 * Bawaannya bulan berjalan; tanpa `?bulan=` sama sekali yang dimaksud bulan
 * ini, bukan sepanjang tahun.
 */
export function createFleetSummary(registeredPlantCount: () => number | null) {
	const current = currentReportPeriod();

	const year = $derived(parseReportYear(page.url.searchParams.get('tahun'), current.year));
	const month = $derived(parseReportMonth(page.url.searchParams.get('bulan'), current.month));
	const endYear = $derived(parseReportEndYear(page.url.searchParams.get('tahun_akhir')));
	const endMonth = $derived(parseReportEndMonth(page.url.searchParams.get('bulan_akhir')));
	const period = $derived({ year, month, endYear, endMonth });
	const periodLabel = $derived(reportPeriodLabel(year, month, endYear, endMonth));
	/** Rentang yang pasti ditolak server tidak dikirim. */
	const rangeError = $derived(reportRangeError(period));

	const query = createMonthlyHydrologyOverviewQuery(
		() => period,
		() => rangeError === null
	);
	const overview = $derived(query.data);

	const fleetAchieved = $derived(overview ? isFleetAchieved(overview) : null);
	/**
	 * Bulan yang benar-benar diwakili angka utama. Angkanya dari blok akumulasi,
	 * dan blok itu memakai SATU bulan — yang terakhir berdata dalam rentang —
	 * karena akumulasi tiap bulan sudah Januari s.d. bulan itu. Untuk rentang
	 * Jan–Sep angkanya posisi s.d. September, bukan gabungan sembilan bulan.
	 */
	const accumulatedThrough = $derived(
		formatReportMonthKey(overview?.accumulated.periodEnd ?? null) ?? periodLabel
	);
	const plantsWithoutData = $derived(
		overview ? missingPlantCount(overview, registeredPlantCount()) : 0
	);
	const needsAttention = $derived(
		Boolean(overview && (plantsWithoutData > 0 || overview.accumulated.unassessedCount > 0))
	);

	/** Laporan Excel periode yang sama, di tab Laporan Hidrologi. */
	const reportHref = $derived(
		`/dashboard/laporan?tab=hidrologi&tahun=${year}&bulan=${month ?? ALL_MONTHS}${
			endYear !== undefined ? `&tahun_akhir=${endYear}` : ''
		}${endMonth !== undefined ? `&bulan_akhir=${endMonth}` : ''}`
	);

	/** Hanya untuk satu bulan tanpa rentang: tombol cepat ke bulan sebelumnya saat kosong. */
	const previousMonth = $derived(
		month !== undefined && !hasReportRange(period) ? previousReportMonth(year, month) : null
	);

	/**
	 * Beberapa parameter diubah dalam SATU navigasi. Dua `goto` berturut-turut
	 * sama-sama membaca URL lama, sehingga yang kedua mengembalikan perubahan
	 * yang pertama.
	 */
	function setPeriods(changes: Partial<Record<FleetPeriodKey, string>>) {
		void goto(nextReportSearch(page.url.searchParams, changes), {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	return {
		get year() {
			return year;
		},
		get month() {
			return month;
		},
		get endYear() {
			return endYear;
		},
		get endMonth() {
			return endMonth;
		},
		get period() {
			return period;
		},
		get periodLabel() {
			return periodLabel;
		},
		get rangeError() {
			return rangeError;
		},
		get query() {
			return query;
		},
		get overview() {
			return overview;
		},
		get fleetAchieved() {
			return fleetAchieved;
		},
		get accumulatedThrough() {
			return accumulatedThrough;
		},
		get plantsWithoutData() {
			return plantsWithoutData;
		},
		get needsAttention() {
			return needsAttention;
		},
		get reportHref() {
			return reportHref;
		},
		get previousMonth() {
			return previousMonth;
		},
		setPeriods
	};
}
