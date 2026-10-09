import { describe, expect, it } from 'vitest';
import type { MonthlyHydrologyOverview, OverviewAchievement } from '$features/hydrology';
import {
	isFleetAchieved,
	missingPlantCount,
	MAX_RANGE_MONTHS,
	NO_RANGE,
	nextReportSearch,
	parseReportEndMonth,
	parseReportEndYear,
	parseReportMonth,
	parseReportYear,
	previousReportMonth,
	formatReportMonthKey,
	reportFilename,
	reportPeriodLabel,
	reportRangeError,
	reportRangeMonthCount,
	resolveReportRange
} from './hydrology-report';

function achievement(patch: Partial<OverviewAchievement> = {}): OverviewAchievement {
	return {
		averagePercent: { value: 104.94, count: 14 },
		aggregatePercent: 92.24,
		totalPredictedMwh: 41849.09,
		totalTargetMwh: 45371.46,
		achievedCount: 4,
		notAchievedCount: 10,
		unassessedCount: 0,
		periodStart: '2026-09',
		periodEnd: '2026-09',
		...patch
	};
}

function overview(
	patch: Partial<MonthlyHydrologyOverview> = {},
	accumulated: Partial<OverviewAchievement> = {}
): MonthlyHydrologyOverview {
	return {
		year: 2026,
		month: null,
		rowCount: 14,
		plantCount: 13,
		monthly: achievement(),
		accumulated: achievement(accumulated),
		averages: {
			predictedProductionMwh: { value: 329.05, count: 14 },
			targetProductionMwh: { value: 330.1, count: 14 },
			actualProductionMwh: { value: 301.2, count: 12 },
			predictedAccumulatedMwh: { value: 2989.22, count: 14 },
			targetAccumulatedMwh: { value: 3240.82, count: 14 },
			actualAccumulatedMwh: { value: 3007.67, count: 14 }
		},
		...patch
	};
}

describe('periode dari URL', () => {
	it('memakai tahun dan bulan yang dipilih', () => {
		expect(parseReportYear('2025', 2026)).toBe(2025);
		expect(parseReportMonth('9', 3)).toBe(9);
	});

	it('membedakan "sepanjang tahun" dari bulan berjalan', () => {
		// `semua` berarti setahun penuh; tanpa parameter sama sekali berarti bulan
		// berjalan — keduanya tidak boleh tertukar karena mengubah isi laporan.
		expect(parseReportMonth('semua', 3)).toBeUndefined();
		expect(parseReportMonth(null, 3)).toBe(3);
	});

	it('mengabaikan nilai di luar batas server', () => {
		expect(parseReportYear('1999', 2026)).toBe(2026);
		expect(parseReportYear('2300', 2026)).toBe(2026);
		expect(parseReportYear('bukan-angka', 2026)).toBe(2026);
		expect(parseReportMonth('13', 3)).toBe(3);
		expect(parseReportMonth('0', 3)).toBe(3);
	});

	it('menamai periodenya sesuai cakupan', () => {
		expect(reportPeriodLabel(2026, 9)).toBe('September 2026');
		expect(reportPeriodLabel(2026, undefined)).toBe('Tahun 2026');
	});
});

describe('rentang periode', () => {
	/** Aturan bawaan server — label, validasi, dan nama berkas harus sepakat dengannya. */
	it('mengisi bagian yang kosong seperti server', () => {
		// `bulan` kosong: Januari s.d. Desember tahun itu.
		expect(resolveReportRange({ year: 2026 })).toEqual({
			startYear: 2026,
			startMonth: 1,
			endYear: 2026,
			endMonth: 12
		});
		// `bulan` terisi, akhir kosong: satu bulan.
		expect(resolveReportRange({ year: 2026, month: 9 })).toMatchObject({
			endYear: 2026,
			endMonth: 9
		});
		// Tahun akhir saja: bulan akhir mengikuti bulan awal.
		expect(resolveReportRange({ year: 2026, month: 3, endYear: 2027 })).toMatchObject({
			endYear: 2027,
			endMonth: 3
		});
		// Bulan akhir saja: tahunnya sama.
		expect(resolveReportRange({ year: 2026, month: 3, endMonth: 8 })).toMatchObject({
			endYear: 2026,
			endMonth: 8
		});
	});

	it('menghitung jumlah bulan secara inklusif, melintasi tahun', () => {
		expect(reportRangeMonthCount({ year: 2026, month: 9 })).toBe(1);
		expect(reportRangeMonthCount({ year: 2026 })).toBe(12);
		expect(reportRangeMonthCount({ year: 2025, month: 11, endYear: 2026, endMonth: 2 })).toBe(4);
	});

	it('menolak rentang terbalik dan yang melebihi 60 bulan', () => {
		expect(reportRangeError({ year: 2026, month: 9, endYear: 2026, endMonth: 3 })).toMatch(
			/sebelum awal/
		);
		expect(reportRangeError({ year: 2020, month: 1, endYear: 2025, endMonth: 1 })).toContain(
			String(MAX_RANGE_MONTHS)
		);
	});

	it('menerima batas tepat 60 bulan, dan periode tanpa rentang selalu sah', () => {
		expect(reportRangeError({ year: 2021, month: 1, endYear: 2025, endMonth: 12 })).toBeNull();
		expect(reportRangeError({ year: 2026, month: 9 })).toBeNull();
		expect(reportRangeError({ year: 2026 })).toBeNull();
	});

	it('membaca akhir periode dari URL, dan mengabaikan nilai tidak valid', () => {
		expect(parseReportEndYear('2027')).toBe(2027);
		expect(parseReportEndYear(null)).toBeUndefined();
		expect(parseReportEndYear('1999')).toBeUndefined();
		expect(parseReportEndMonth('12')).toBe(12);
		expect(parseReportEndMonth('13')).toBeUndefined();
		expect(parseReportEndMonth('tanpa')).toBeUndefined();
	});

	it('menamai rentang dengan awal dan akhirnya', () => {
		expect(reportPeriodLabel(2026, 1, 2026, 9)).toBe('Januari 2026 – September 2026');
		expect(reportPeriodLabel(2026, undefined, 2027)).toBe('Januari 2026 – Desember 2027');
		expect(reportPeriodLabel(2026, 9, 2026, 9)).toBe('September 2026');
	});
});

describe('nama berkas laporan', () => {
	it('memuat awal dan akhir rentang', () => {
		expect(
			reportFilename({ kind: 'bulanan', year: 2026, month: 1, endYear: 2026, endMonth: 9 })
		).toBe('laporan-hidrologi-bulanan-2026-01-sd-2026-09.xlsx');
	});

	it('memuat periode, panel, dan kode PLTA', () => {
		expect(
			reportFilename({ kind: 'harian', year: 2026, month: 9, panel: 'hulu', plantCode: 'PLTA-SDJ' })
		).toBe('laporan-hidrologi-harian-2026-09-hulu-plta-sdj.xlsx');
	});

	it('menghilangkan bagian yang tidak dipilih', () => {
		expect(reportFilename({ kind: 'bulanan', year: 2026 })).toBe(
			'laporan-hidrologi-bulanan-2026.xlsx'
		);
	});

	it('membedakan laporan satu bulan dari setahun penuh', () => {
		const setahun = reportFilename({ kind: 'bulanan', year: 2026 });
		const sebulan = reportFilename({ kind: 'bulanan', year: 2026, month: 9 });

		expect(sebulan).not.toBe(setahun);
	});
});

describe('status gabungan', () => {
	/**
	 * Aturan backend: dinilai dari prediksi ≥ target, bukan persentase ≥ 100.
	 * `prosentase` dibulatkan dua desimal, jadi 99,996% terbaca 100,0.
	 */
	it('belum tercapai walau persentasenya membulat ke 100', () => {
		const hampir = overview(
			{},
			{ aggregatePercent: 100, totalPredictedMwh: 99.996, totalTargetMwh: 100 }
		);

		expect(isFleetAchieved(hampir)).toBe(false);
	});

	it('tercapai bila prediksi menyamai atau melampaui target', () => {
		expect(isFleetAchieved(overview({}, { totalPredictedMwh: 100, totalTargetMwh: 100 }))).toBe(
			true
		);
	});

	it('tidak menilai periode yang belum punya angka', () => {
		expect(isFleetAchieved(overview({}, { aggregatePercent: null }))).toBeNull();
	});
});

describe('cakupan seluruh PLTA', () => {
	it('menghitung PLTA yang belum punya data periode ini', () => {
		expect(missingPlantCount(overview({ plantCount: 11 }), 13)).toBe(2);
	});

	it('tidak menuduh kekurangan saat katalog belum dimuat', () => {
		expect(missingPlantCount(overview({ plantCount: 11 }), null)).toBe(0);
	});

	it('tidak pernah negatif bila server menghitung lebih banyak baris', () => {
		expect(missingPlantCount(overview({ plantCount: 14 }), 13)).toBe(0);
	});
});

describe('query string periode', () => {
	it('mengubah beberapa parameter dalam satu langkah', () => {
		const current = new URLSearchParams('tab=hidrologi&tahun=2026&bulan=3');

		expect(nextReportSearch(current, { tahun: '2025', bulan_akhir: '9' })).toBe(
			'?tab=hidrologi&tahun=2025&bulan=3&bulan_akhir=9'
		);
	});

	it('menghapus akhir rentang dan cakupan seluruh PLTA, bukan menuliskannya', () => {
		const current = new URLSearchParams('tahun=2026&tahun_akhir=2027&bulan_akhir=2&plta=abc');

		expect(
			nextReportSearch(current, { tahun_akhir: NO_RANGE, bulan_akhir: NO_RANGE, plta: 'semua' })
		).toBe('?tahun=2026');
	});

	it('tidak mengubah URL asalnya', () => {
		const current = new URLSearchParams('tahun=2026');
		nextReportSearch(current, { tahun: '2020' });

		expect(current.get('tahun')).toBe('2026');
	});
});

describe('bulan sebelumnya', () => {
	it('mundur satu bulan, dan Januari ke Desember tahun lalu', () => {
		expect(previousReportMonth(2026, 10)).toEqual({ year: 2026, month: 9 });
		expect(previousReportMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
	});
});

describe('bulan dari kunci YYYY-MM', () => {
	it('menulis nama bulan dan tahun', () => {
		expect(formatReportMonthKey('2026-09')).toBe('September 2026');
	});

	it('null untuk nilai kosong atau tidak dikenal', () => {
		expect(formatReportMonthKey(null)).toBeNull();
		expect(formatReportMonthKey('2026-13')).toBeNull();
		expect(formatReportMonthKey('Sep 2026')).toBeNull();
	});
});
