import { describe, expect, it } from 'vitest';
import { hydrologyQueryKeys } from './queries';

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

/** Apakah `key` ikut kena saat `prefix` diinvalidasi TanStack Query. */
function isCoveredBy(key: readonly unknown[], prefix: readonly unknown[]): boolean {
	return prefix.every((segment, index) => key[index] === segment);
}

/**
 * Regresi: simpan berhasil tapi Ringkasan dan gambar di halaman tidak ikut
 * berubah.
 *
 * Mutation hanya menyebut kunci induk saat invalidasi. Yang menentukan panel
 * ikut diambil ulang adalah bentuk kuncinya — panel harus bersarang di bawah
 * `dashboardRoot`. Kalau suatu saat urutan segmennya diubah, invalidasi berhenti
 * bekerja tanpa satu pun uji lain yang gagal.
 */
describe('hydrologyQueryKeys', () => {
	it('menempatkan panel bulanan di bawah dashboard PLTA', () => {
		// `createUpsertMonthlyHydrologyMutation` menginvalidasi `dashboardRoot`.
		expect(
			isCoveredBy(
				hydrologyQueryKeys.monthlyPanel(PLTA_ID, 2026, 9),
				hydrologyQueryKeys.dashboardRoot(PLTA_ID)
			)
		).toBe(true);
	});

	it('menempatkan panel harian di bawah dashboard PLTA', () => {
		expect(
			isCoveredBy(hydrologyQueryKeys.daily(PLTA_ID), hydrologyQueryKeys.dashboardRoot(PLTA_ID))
		).toBe(true);
	});

	it('menempatkan gambar bulanan di bawah akar hidrologi', () => {
		// Unggahan gambar menyentuh seluruh PLTA, jadi mutation-nya menginvalidasi
		// `all` — gambar dan panel keduanya harus ikut tercakup.
		expect(
			isCoveredBy(
				hydrologyQueryKeys.monthlyImage(2026, 9, 'prediksi_curah_hujan'),
				hydrologyQueryKeys.all
			)
		).toBe(true);
		expect(
			isCoveredBy(hydrologyQueryKeys.monthlyPanel(PLTA_ID, 2026, 9), hydrologyQueryKeys.all)
		).toBe(true);
	});

	it('tidak mencampur dashboard antar-PLTA', () => {
		const other = '22222222-2222-4222-8222-222222222222';
		expect(
			isCoveredBy(
				hydrologyQueryKeys.monthlyPanel(PLTA_ID, 2026, 9),
				hydrologyQueryKeys.dashboardRoot(other)
			)
		).toBe(false);
	});

	it('memisahkan gambar per periode dan jenis', () => {
		expect(hydrologyQueryKeys.monthlyImage(2026, 9, 'prediksi_curah_hujan')).not.toEqual(
			hydrologyQueryKeys.monthlyImage(2026, 9, 'prediksi_sifat_hujan')
		);
		expect(hydrologyQueryKeys.monthlyImage(2026, 9, 'prediksi_curah_hujan')).not.toEqual(
			hydrologyQueryKeys.monthlyImage(2026, 10, 'prediksi_curah_hujan')
		);
	});
});

/**
 * Excel harian menulis nilai lintas banyak PLTA dan banyak parameter sekaligus,
 * jadi panel harian mana pun bisa berubah. Kunci ringkasan seluruh PLTA sengaja ikut
 * bersarang di bawah akar hidrologi supaya satu invalidasi menyegarkan semuanya
 * — kalau suatu saat dipindah keluar, angka gabungan akan tertinggal basi setelah
 * unggahan tanpa ada uji lain yang gagal.
 */
describe('cakupan invalidasi setelah unggahan', () => {
	it('menyegarkan panel harian, ringkasan seluruh PLTA, dan daftar bulanan sekaligus', () => {
		const root = hydrologyQueryKeys.all;

		expect(isCoveredBy(hydrologyQueryKeys.daily(PLTA_ID), root)).toBe(true);
		expect(isCoveredBy(hydrologyQueryKeys.monthlyOverview({ year: 2026 }), root)).toBe(true);
		expect(isCoveredBy(hydrologyQueryKeys.monthly(PLTA_ID, 2026), root)).toBe(true);
	});

	it('memisahkan ringkasan per periode', () => {
		// Sepanjang tahun dan satu bulan adalah angka berbeda; keduanya tidak boleh
		// berbagi satu entri cache.
		expect(hydrologyQueryKeys.monthlyOverview({ year: 2026 })).not.toEqual(
			hydrologyQueryKeys.monthlyOverview({ year: 2026, month: 9 })
		);
	});

	it('memisahkan periode yang sama awalnya tetapi berbeda akhir rentangnya', () => {
		expect(hydrologyQueryKeys.monthlyOverview({ year: 2026, month: 1 })).not.toEqual(
			hydrologyQueryKeys.monthlyOverview({ year: 2026, month: 1, endYear: 2026, endMonth: 9 })
		);
	});

	it('menyegarkan grafik akumulasi satu PLTA saat isian bulanannya berubah', () => {
		// Mengubah isian bulanan menginvalidasi `dashboardRoot(pltaId)`.
		const chart = hydrologyQueryKeys.monthlyChart(PLTA_ID, { year: 2026 });

		expect(isCoveredBy(chart, hydrologyQueryKeys.dashboardRoot(PLTA_ID))).toBe(true);
		expect(isCoveredBy(chart, hydrologyQueryKeys.all)).toBe(true);
	});
});
