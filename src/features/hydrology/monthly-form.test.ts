import { describe, expect, it } from 'vitest';
import {
	buildMonthlyHydrologyPayload,
	createEmptyMonthlyForm,
	isEmptyMonthlyHydrologyPayload
} from './monthly-form';

/**
 * Regresi: mengisi field energi saja membuat tombol Simpan tidak melakukan apa
 * pun — tanpa toast, tanpa request.
 *
 * `bind:value` pada `<input type="number">` mengembalikan angka, bukan string,
 * sementara payload dulu disusun dengan `value.trim()`. `TypeError` yang muncul
 * terjadi di luar `try`, jadi kegagalannya sunyi total. Field teks lolos karena
 * `<textarea>` memang tetap string — itulah kenapa gejalanya terlihat sebagai
 * "yang angka tidak bisa, yang string bisa".
 */
describe('buildMonthlyHydrologyPayload', () => {
	it('meneruskan angka dari input number apa adanya', () => {
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			predictedProductionMwh: 150,
			targetProductionMwh: 1234.5
		});

		expect(payload.predictedProductionMwh).toBe(150);
		expect(payload.targetProductionMwh).toBe(1234.5);
	});

	it('menerima nol sebagai nilai yang sah', () => {
		// Nol berbeda dari kosong: produksi 0 MWh adalah data, bukan ketiadaan
		// data, jadi tidak boleh ikut terbuang bersama field kosong.
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			previousAchievementMwh: 0
		});

		expect(payload.previousAchievementMwh).toBe(0);
		expect(isEmptyMonthlyHydrologyPayload(payload)).toBe(false);
	});

	it('membuang field angka yang dikosongkan', () => {
		// `null` inilah yang dikirim binding saat isian dihapus operator.
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			predictedProductionMwh: null
		});

		expect(payload.predictedProductionMwh).toBeUndefined();
	});

	it('membuang teks yang hanya berisi spasi', () => {
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			hydrologyPrediction: '   '
		});

		expect(payload.hydrologyPrediction).toBeUndefined();
	});

	it('mempertahankan teks dan angka bersamaan', () => {
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			hydrologyPrediction: 'Normal–Basah',
			predictedProductionMwh: 150
		});

		expect(payload).toMatchObject({
			hydrologyPrediction: 'Normal–Basah',
			predictedProductionMwh: 150
		});
	});
});

describe('isEmptyMonthlyHydrologyPayload', () => {
	it('menandai form yang sama sekali belum diisi', () => {
		// Upsert parsial: kiriman kosong akan menimpa data tersimpan dengan
		// "tidak ada", jadi harus ditahan sebelum menyentuh server.
		expect(
			isEmptyMonthlyHydrologyPayload(buildMonthlyHydrologyPayload(createEmptyMonthlyForm()))
		).toBe(true);
	});
});
