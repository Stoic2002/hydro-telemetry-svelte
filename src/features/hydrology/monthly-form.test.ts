import { describe, expect, it } from 'vitest';
import {
	MONTHLY_HYDROLOGY_CONDITIONS,
	buildMonthlyHydrologyPayload,
	createEmptyMonthlyForm,
	isEmptyMonthlyHydrologyPayload,
	isLegacyHydrologyCondition,
	matchHydrologyCondition
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
			actualAccumulatedMwh: 0
		});

		expect(payload.actualAccumulatedMwh).toBe(0);
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

	it('mempertahankan kondisi dan angka bersamaan', () => {
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			hydrologyPrediction: 'Normal Basah',
			predictedProductionMwh: 150
		});

		expect(payload).toMatchObject({
			hydrologyPrediction: 'Normal Basah',
			predictedProductionMwh: 150
		});
	});
});

/**
 * Sejak Swagger 6 Nov 2026 kondisi hidrologi wajib salah satu dari lima kelas;
 * nilai lain ditolak `422` dan seluruh isian ikut gagal tersimpan.
 */
describe('kondisi hidrologi', () => {
	it('mengenali kelas tanpa peduli huruf besar kecil dan mengembalikan bentuk bakunya', () => {
		expect(matchHydrologyCondition('basah', MONTHLY_HYDROLOGY_CONDITIONS)).toBe('Basah');
		expect(matchHydrologyCondition(' normal kering ', MONTHLY_HYDROLOGY_CONDITIONS)).toBe(
			'Normal Kering'
		);
	});

	it('menolak isian bebas lama yang bukan kelas', () => {
		expect(matchHydrologyCondition('serak', MONTHLY_HYDROLOGY_CONDITIONS)).toBeNull();
		expect(matchHydrologyCondition('Normal–Basah', MONTHLY_HYDROLOGY_CONDITIONS)).toBeNull();
		expect(isLegacyHydrologyCondition('serak', MONTHLY_HYDROLOGY_CONDITIONS)).toBe(true);
		expect(isLegacyHydrologyCondition('Basah', MONTHLY_HYDROLOGY_CONDITIONS)).toBe(false);
		expect(isLegacyHydrologyCondition(null, MONTHLY_HYDROLOGY_CONDITIONS)).toBe(false);
	});

	it('mengirim bentuk baku dari kelas yang dipilih', () => {
		const payload = buildMonthlyHydrologyPayload({
			...createEmptyMonthlyForm(),
			hydrologyActual: 'kering'
		});

		expect(payload.hydrologyActual).toBe('Kering');
	});

	it('tidak mengirim ulang nilai lama di luar kelas, supaya simpan bidang lain tidak ditolak', () => {
		const payload = buildMonthlyHydrologyPayload(
			{ ...createEmptyMonthlyForm(), hydrologyActual: 'serak', targetProductionMwh: 200 },
			{ saved: { hydrologyPrediction: null, hydrologyActual: 'serak' } }
		);

		expect(payload.hydrologyActual).toBeUndefined();
		expect(payload.targetProductionMwh).toBe(200);
	});

	it('"Belum diisi" mengosongkan kondisi yang tersimpan', () => {
		const payload = buildMonthlyHydrologyPayload(
			{ ...createEmptyMonthlyForm(), hydrologyPrediction: '' },
			{ saved: { hydrologyPrediction: 'Basah', hydrologyActual: null } }
		);

		expect(payload.hydrologyPrediction).toBe('');
		expect(isEmptyMonthlyHydrologyPayload(payload)).toBe(false);
	});

	it('tidak mengirim apa pun bila kondisi memang belum pernah diisi', () => {
		const payload = buildMonthlyHydrologyPayload(createEmptyMonthlyForm(), {
			saved: { hydrologyPrediction: null, hydrologyActual: '' }
		});

		expect(payload.hydrologyPrediction).toBeUndefined();
		expect(payload.hydrologyActual).toBeUndefined();
	});

	it('memakai daftar kelas dari server bila diberikan', () => {
		const payload = buildMonthlyHydrologyPayload(
			{ ...createEmptyMonthlyForm(), hydrologyPrediction: 'sangat basah' },
			{ conditions: ['Sangat Basah'] }
		);

		expect(payload.hydrologyPrediction).toBe('Sangat Basah');
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
