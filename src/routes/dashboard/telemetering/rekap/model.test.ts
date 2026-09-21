import { describe, expect, it } from 'vitest';
import type { MonthlyHydrologyOverview } from '$features/hydrology';
import {
	isFleetAchieved,
	missingPlantCount,
	parseReportMonth,
	parseReportYear,
	reportFilename,
	reportPeriodLabel
} from './model';

function overview(patch: Partial<MonthlyHydrologyOverview> = {}): MonthlyHydrologyOverview {
	return {
		year: 2026,
		month: null,
		rowCount: 14,
		plantCount: 13,
		averageAchievementPercent: { value: 104.94, count: 14 },
		aggregateAchievementPercent: 92.24,
		totalPredictedAchievementMwh: 41849.09,
		totalTargetAchievementMwh: 45371.46,
		achievedCount: 4,
		notAchievedCount: 10,
		unassessedCount: 0,
		averages: {
			predictedProductionMwh: { value: 329.05, count: 14 },
			targetProductionMwh: { value: 330.1, count: 14 },
			previousAchievementMwh: { value: 3007.67, count: 14 },
			predictedPreviousAchievementMwh: { value: 2989.22, count: 14 },
			targetPreviousAchievementMwh: { value: 3240.82, count: 14 }
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

describe('nama berkas laporan', () => {
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

describe('status armada', () => {
	/**
	 * Aturan backend: dinilai dari prediksi ≥ target, bukan persentase ≥ 100.
	 * `prosentase` dibulatkan dua desimal, jadi 99,996% terbaca 100,0.
	 */
	it('belum tercapai walau persentasenya membulat ke 100', () => {
		const hampir = overview({
			aggregateAchievementPercent: 100,
			totalPredictedAchievementMwh: 99.996,
			totalTargetAchievementMwh: 100
		});

		expect(isFleetAchieved(hampir)).toBe(false);
	});

	it('tercapai bila prediksi menyamai atau melampaui target', () => {
		expect(
			isFleetAchieved(
				overview({ totalPredictedAchievementMwh: 100, totalTargetAchievementMwh: 100 })
			)
		).toBe(true);
	});

	it('tidak menilai periode yang belum punya angka', () => {
		expect(isFleetAchieved(overview({ aggregateAchievementPercent: null }))).toBeNull();
	});
});

describe('cakupan armada', () => {
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
