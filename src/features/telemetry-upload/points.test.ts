import { describe, expect, it } from 'vitest';
import {
	hasTelemetryRowErrors,
	initialTelemetryRow,
	validateTelemetryRows,
	buildConstantPoint,
	buildDeleteRange,
	buildTelemetryPoints,
	isConstantParameter,
	isDailyValueParameter
} from './points';

/**
 * Regresi yang sama seperti form hidrologi bulanan: `value` diikat ke
 * `<input type="number">`, jadi isinya angka. Kode lama memanggil
 * `row.value.trim()` dan melempar `TypeError` di luar `try`, sehingga tombol
 * Simpan tidak melakukan apa pun.
 */
describe('buildTelemetryPoints', () => {
	it('menyusun titik dari nilai angka', () => {
		expect(
			buildTelemetryPoints([
				{ date: '2026-09-09', time: '07:00', value: 231.5 },
				{ date: '2026-09-09', time: '08:00', value: 0 }
			])
		).toEqual([
			{ time: '2026-09-09T07:00:00', value: 231.5 },
			{ time: '2026-09-09T08:00:00', value: 0 }
		]);
	});

	it('menolak baris yang nilainya belum diisi', () => {
		expect(buildTelemetryPoints([{ date: '2026-09-09', time: '07:00', value: null }])).toBeNull();
	});

	it('menolak nilai yang bukan angka terhingga', () => {
		expect(
			buildTelemetryPoints([{ date: '2026-09-09', time: '07:00', value: Number.NaN }])
		).toBeNull();
	});

	it('menolak tanggal atau jam yang kosong', () => {
		expect(buildTelemetryPoints([{ date: '', time: '07:00', value: 1 }])).toBeNull();
		expect(buildTelemetryPoints([{ date: '2026-09-09', time: '', value: 1 }])).toBeNull();
	});

	it('menolak timestamp duplikat', () => {
		// Server melakukan upsert: dua baris berwaktu sama akan saling menimpa
		// diam-diam dan operator mengira keduanya tersimpan.
		expect(
			buildTelemetryPoints([
				{ date: '2026-09-09', time: '07:00', value: 1 },
				{ date: '2026-09-09', time: '07:00', value: 2 }
			])
		).toBeNull();
	});

	it('menolak daftar kosong', () => {
		expect(buildTelemetryPoints([])).toBeNull();
	});
});

describe('buildDeleteRange', () => {
	const day = (date: string, time: string) => ({ date, time });

	it('menyusun rentang tanpa zona waktu, kedua ujung apa adanya', () => {
		expect(buildDeleteRange(day('2026-08-01', '00:00'), day('2026-08-01', '23:00'))).toEqual({
			ok: true,
			start: '2026-08-01T00:00:00',
			end: '2026-08-01T23:00:00'
		});
	});

	it('menerima awal sama dengan akhir — satu titik', () => {
		expect(buildDeleteRange(day('2026-08-01', '07:00'), day('2026-08-01', '07:00')).ok).toBe(true);
	});

	it('menolak isian yang belum lengkap', () => {
		expect(buildDeleteRange(day('', '00:00'), day('2026-08-01', '23:00')).ok).toBe(false);
		expect(buildDeleteRange(day('2026-08-01', ''), day('2026-08-01', '23:00')).ok).toBe(false);
	});

	it('menolak rentang terbalik', () => {
		expect(buildDeleteRange(day('2026-08-02', '00:00'), day('2026-08-01', '23:00'))).toEqual({
			ok: false,
			error: 'Waktu akhir harus sama dengan atau setelah waktu awal'
		});
	});

	it('menolak rentang lebih dari 366 hari, menerima tepat 366 hari', () => {
		expect(buildDeleteRange(day('2025-01-01', '00:00'), day('2026-01-02', '00:00')).ok).toBe(true);
		expect(buildDeleteRange(day('2025-01-01', '00:00'), day('2026-01-02', '00:01'))).toEqual({
			ok: false,
			error: 'Rentang maksimal 366 hari'
		});
	});
});

describe('konstanta', () => {
	it('mengenali parameter konstanta dari awalan const_', () => {
		expect(isConstantParameter('const_tma_limpas')).toBe(true);
		expect(isConstantParameter('const_swc')).toBe(true);
		expect(isConstantParameter('plan_outflow_spillway')).toBe(false);
	});

	it('satu titik pada saat ini dalam WIB tanpa zona', () => {
		const now = new Date('2026-10-27T03:04:05Z');

		expect(buildConstantPoint(231.5, now)).toEqual([{ time: '2026-10-27T10:04:05', value: 231.5 }]);
	});

	it('menolak nilai kosong', () => {
		expect(buildConstantPoint(null)).toBeNull();
		expect(buildConstantPoint(Number.NaN)).toBeNull();
	});
});

describe('Target TMA', () => {
	it('hanya plan_water_level yang bernilai per tanggal', () => {
		expect(isDailyValueParameter('plan_water_level')).toBe(true);
		expect(isDailyValueParameter('plan_outflow_hjv')).toBe(false);
	});
});

/** Temuan QA T5 (4 Nov 2026): galat ditempel di bidangnya, bukan satu toast umum. */
describe('validateTelemetryRows', () => {
	it('Target TMA tidak pernah meminta jam', () => {
		const [errors] = validateTelemetryRows([{ date: '2026-11-06', time: '', value: null }], {
			dailyValue: true
		});

		expect(errors).toEqual({ value: 'Isi nilai.' });
	});

	it('menandai bidang yang kosong per baris', () => {
		expect(
			validateTelemetryRows(
				[
					{ date: '2026-11-06', time: '10:00', value: 1 },
					{ date: '', time: '', value: null }
				],
				{ dailyValue: false }
			)
		).toEqual([{}, { date: 'Isi tanggal.', time: 'Isi jam.', value: 'Isi nilai.' }]);
	});

	it('menandai waktu kembar di baris kedua', () => {
		const rows = [
			{ date: '2026-11-06', time: '10:00', value: 1 },
			{ date: '2026-11-06', time: '10:00', value: 2 }
		];

		expect(validateTelemetryRows(rows, { dailyValue: false })[1].time).toContain('sudah ada');
		expect(validateTelemetryRows(rows, { dailyValue: true })[1].date).toContain('sudah ada');
		expect(hasTelemetryRowErrors(validateTelemetryRows(rows, { dailyValue: false }))).toBe(true);
	});

	it('baris yang lengkap tidak bergalat', () => {
		expect(
			hasTelemetryRowErrors(
				validateTelemetryRows([{ date: '2026-11-06', time: '10:00', value: 0 }], {
					dailyValue: false
				})
			)
		).toBe(false);
	});
});

/** Temuan QA T6: "Edit data" terisi nilai yang tersimpan pada waktu yang sama. */
describe('initialTelemetryRow', () => {
	const options = { constant: false, dailyValue: false };

	it('kosong untuk Input data', () => {
		expect(initialTelemetryRow(undefined, '2026-11-06', options)).toEqual({
			date: '2026-11-06',
			time: '00:00',
			value: null
		});
	});

	it('titik berjam diisi tanggal dan jam WIB dari waktu ukurnya', () => {
		expect(
			initialTelemetryRow({ value: 12.5, time: '2026-11-06T03:00:00Z' }, '2026-11-05', options)
		).toEqual({ date: '2026-11-06', time: '10:00', value: 12.5 });
	});

	it('Target TMA memakai tanggal waktu ukurnya pada 00.00', () => {
		expect(
			initialTelemetryRow({ value: 229.5, time: '2026-11-04T00:00:00+07:00' }, '2026-11-06', {
				constant: false,
				dailyValue: true
			})
		).toEqual({ date: '2026-11-04', time: '00:00', value: 229.5 });
	});

	it('konstanta hanya mengisi nilai', () => {
		expect(
			initialTelemetryRow({ value: 231.1, time: null }, '2026-11-06', {
				constant: true,
				dailyValue: false
			}).value
		).toBe(231.1);
	});

	it('titik berjam tanpa waktu ukur tidak diisi, supaya tidak membuat titik baru', () => {
		expect(initialTelemetryRow({ value: 5, time: null }, '2026-11-06', options).value).toBeNull();
	});
});
