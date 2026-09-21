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
			isCoveredBy(hydrologyQueryKeys.monthlyImage(2026, 9, 'curah_hujan'), hydrologyQueryKeys.all)
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
		expect(hydrologyQueryKeys.monthlyImage(2026, 9, 'curah_hujan')).not.toEqual(
			hydrologyQueryKeys.monthlyImage(2026, 9, 'sifat_hujan')
		);
		expect(hydrologyQueryKeys.monthlyImage(2026, 9, 'curah_hujan')).not.toEqual(
			hydrologyQueryKeys.monthlyImage(2026, 10, 'curah_hujan')
		);
	});
});

/**
 * Excel harian menulis nilai lintas banyak PLTA dan banyak parameter sekaligus,
 * jadi panel harian mana pun bisa berubah. Kunci ringkasan armada sengaja ikut
 * bersarang di bawah akar hidrologi supaya satu invalidasi menyegarkan semuanya
 * — kalau suatu saat dipindah keluar, angka armada akan tertinggal basi setelah
 * unggahan tanpa ada uji lain yang gagal.
 */
describe('cakupan invalidasi setelah unggahan', () => {
	it('menyegarkan panel harian, ringkasan armada, dan daftar bulanan sekaligus', () => {
		const root = hydrologyQueryKeys.all;

		expect(isCoveredBy(hydrologyQueryKeys.daily(PLTA_ID), root)).toBe(true);
		expect(isCoveredBy(hydrologyQueryKeys.monthlyOverview(2026, undefined), root)).toBe(true);
		expect(isCoveredBy(hydrologyQueryKeys.monthly(PLTA_ID, 2026), root)).toBe(true);
	});

	it('memisahkan ringkasan per periode', () => {
		// Sepanjang tahun dan satu bulan adalah angka berbeda; keduanya tidak boleh
		// berbagi satu entri cache.
		expect(hydrologyQueryKeys.monthlyOverview(2026, undefined)).not.toEqual(
			hydrologyQueryKeys.monthlyOverview(2026, 9)
		);
	});
});
